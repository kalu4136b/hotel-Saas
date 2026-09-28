import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  Tenant,
  TenantStatus,
  SubscriptionTier,
} from '../entities/tenant.entity';
import { Property } from '../entities/property.entity';
import { User, UserRole } from '../entities/user.entity';
import { POSOutlet } from '../entities/pos-outlet.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { DiningTable, TableStatus } from '../entities/dining-table.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check existing username or email
      const existingUser = await queryRunner.manager.findOne(User, {
        where: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
      });

      if (existingUser) {
        if (existingUser.email.toLowerCase() === dto.email.toLowerCase()) {
          throw new ConflictException('An account with this email address already exists');
        }
        throw new ConflictException('This username is already taken. Please choose another');
      }

      // 2. Generate unique tenant slug
      const propertyTitle = dto.propertyName?.trim() || `${dto.fullName.trim()}'s Resort`;
      const baseSlug = propertyTitle
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'hotel';
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      // 3. Create Tenant
      const tenant = queryRunner.manager.create(Tenant, {
        name: propertyTitle,
        slug: uniqueSlug,
        status: TenantStatus.ACTIVE,
        subscriptionTier: SubscriptionTier.STARTER,
      });
      const savedTenant = await queryRunner.manager.save(tenant);

      // 4. Create Default Property
      const property = queryRunner.manager.create(Property, {
        tenantId: savedTenant.id,
        name: propertyTitle,
        code: 'PROP-01',
        currency: dto.currency || 'USD',
        timezone: 'UTC',
        defaultTaxRate: 10.0,
        serviceChargeRate: 0.0,
        phone: dto.phone || undefined,
        email: dto.email.toLowerCase(),
        isActive: true,
      });
      const savedProperty = await queryRunner.manager.save(property);

      // 5. Create Default POS Outlet
      const outlet = queryRunner.manager.create(POSOutlet, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        name: 'Main Restaurant & Bar',
        code: 'OUT-01',
        isActive: true,
      });
      const savedOutlet = await queryRunner.manager.save(outlet);

      // 6. Hash password and Create User (Tenant Admin)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(dto.password, salt);

      const user = queryRunner.manager.create(User, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        fullName: dto.fullName.trim(),
        phone: dto.phone || undefined,
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        isActive: true,
      });
      const savedUser = await queryRunner.manager.save(user);

      // 7. Seed Initial Menu Categories
      const categoriesData = [
        { name: 'Beverages', sortOrder: 1, description: 'Coffee, tea, juices & refreshments' },
        { name: 'Appetizers', sortOrder: 2, description: 'Starters, soups & finger food' },
        { name: 'Main Courses', sortOrder: 3, description: 'Chef special gourmet dishes' },
        { name: 'Desserts', sortOrder: 4, description: 'Sweet treats & pastries' },
      ];

      const savedCategories: Category[] = [];
      for (const catData of categoriesData) {
        const cat = queryRunner.manager.create(Category, {
          tenantId: savedTenant.id,
          propertyId: savedProperty.id,
          outletId: savedOutlet.id,
          name: catData.name,
          description: catData.description,
          sortOrder: catData.sortOrder,
          isActive: true,
        });
        savedCategories.push(await queryRunner.manager.save(cat));
      }

      // 8. Seed Initial Products (Real Menu Items)
      const bevCategory = savedCategories.find((c) => c.name === 'Beverages')!;
      const mainCategory = savedCategories.find((c) => c.name === 'Main Courses')!;
      const dessertCategory = savedCategories.find((c) => c.name === 'Desserts')!;

      const initialProducts = [
        {
          name: 'Signature Angus Burger',
          sku: 'M-001',
          price: 15.5,
          categoryId: mainCategory.id,
          description: 'Brioche bun, prime Angus beef, cheddar, caramelized onions, fries',
        },
        {
          name: 'Classic Margherita Pizza',
          sku: 'M-002',
          price: 13.0,
          categoryId: mainCategory.id,
          description: 'San Marzano tomatoes, fresh buffalo mozzarella, fragrant basil',
        },
        {
          name: 'Iced Caramel Macchiato',
          sku: 'B-001',
          price: 5.5,
          categoryId: bevCategory.id,
          description: 'Fresh espresso, velvety milk, vanilla syrup, caramel drizzle',
        },
        {
          name: 'Tropical Mango Smoothie',
          sku: 'B-002',
          price: 6.0,
          categoryId: bevCategory.id,
          description: 'Blended fresh mango, Greek yogurt, wildflower honey',
        },
        {
          name: 'Warm Belgian Chocolate Lava Cake',
          sku: 'D-001',
          price: 7.5,
          categoryId: dessertCategory.id,
          description: 'Rich dark molten core, vanilla bean gelato',
        },
      ];

      for (const prodData of initialProducts) {
        const prod = queryRunner.manager.create(Product, {
          tenantId: savedTenant.id,
          propertyId: savedProperty.id,
          outletId: savedOutlet.id,
          categoryId: prodData.categoryId,
          name: prodData.name,
          sku: prodData.sku,
          price: prodData.price,
          taxRate: 10.0,
          description: prodData.description,
          isActive: true,
        });
        await queryRunner.manager.save(prod);
      }

      // 9. Seed Initial Dining Tables
      const tablesData = [
        { tableNumber: 'Table 1', capacity: 2 },
        { tableNumber: 'Table 2', capacity: 4 },
        { tableNumber: 'Table 3', capacity: 4 },
        { tableNumber: 'Table 4', capacity: 6 },
        { tableNumber: 'Patio 1', capacity: 4 },
        { tableNumber: 'Patio 2', capacity: 2 },
      ];

      for (const tbl of tablesData) {
        const diningTable = queryRunner.manager.create(DiningTable, {
          tenantId: savedTenant.id,
          propertyId: savedProperty.id,
          outletId: savedOutlet.id,
          tableNumber: tbl.tableNumber,
          capacity: tbl.capacity,
          status: TableStatus.AVAILABLE,
          isActive: true,
        });
        await queryRunner.manager.save(diningTable);
      }

      // 10. Audit Log Entry
      const audit = queryRunner.manager.create(AuditLog, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        userId: savedUser.id,
        action: 'TENANT_REGISTERED',
        entity: 'Tenant',
        entityId: savedTenant.id,
        details: JSON.stringify({
          tenantName: savedTenant.name,
          property: savedProperty.name,
          adminEmail: savedUser.email,
        }),
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();

      // Generate Access Token
      const token = this.generateToken(savedUser, savedTenant.id, savedProperty.id);

      return {
        accessToken: token,
        user: {
          id: savedUser.id,
          username: savedUser.username,
          email: savedUser.email,
          fullName: savedUser.fullName,
          role: savedUser.role,
        },
        tenant: {
          id: savedTenant.id,
          name: savedTenant.name,
          slug: savedTenant.slug,
          subscriptionTier: savedTenant.subscriptionTier,
        },
        property: {
          id: savedProperty.id,
          name: savedProperty.name,
          currency: savedProperty.currency,
          defaultTaxRate: savedProperty.defaultTaxRate,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: LoginDto) {
    const identifier = dto.usernameOrEmail.trim().toLowerCase();

    const user = await this.dataSource.getRepository(User).findOne({
      where: [{ email: identifier }, { username: identifier }],
      relations: { property: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials. Please verify username/email and password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your user account has been deactivated. Please contact support');
    }

    if (user.tenant && user.tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException('Your hotel subscription is suspended or pending activation');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials. Please verify username/email and password');
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await this.dataSource.getRepository(User).save(user);

    const token = this.generateToken(user, user.tenantId, user.propertyId);

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tenant: {
        id: user.tenant?.id || user.tenantId,
        name: user.tenant?.name,
        slug: user.tenant?.slug,
        subscriptionTier: user.tenant?.subscriptionTier,
      },
      property: {
        id: user.property?.id || user.propertyId,
        name: user.property?.name,
        currency: user.property?.currency || 'USD',
        defaultTaxRate: user.property?.defaultTaxRate || 10.0,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: { property: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tenant: user.tenant,
      property: user.property,
    };
  }

  private generateToken(user: User, tenantId: string, propertyId?: string): string {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      tenantId: tenantId,
      propertyId: propertyId || user.propertyId,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
