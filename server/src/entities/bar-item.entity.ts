import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BarCategory {
  WHISKEY = 'WHISKEY',
  VODKA = 'VODKA',
  GIN = 'GIN',
  RUM = 'RUM',
  TEQUILA = 'TEQUILA',
  BRANDY = 'BRANDY',
  WINE = 'WINE',
  BEER = 'BEER',
  LIQUEUR = 'LIQUEUR',
  COCKTAIL = 'COCKTAIL',
  MIXER = 'MIXER',
  OTHER = 'OTHER',
}

@Entity('bar_items')
@Index(['tenantId', 'propertyId'])
export class BarItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({
    type: 'enum',
    enum: BarCategory,
    default: BarCategory.WHISKEY,
  })
  category: BarCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'int', default: 750 })
  bottleSizeMl: number;

  @Column({ type: 'int', default: 0 })
  fullBottlesStock: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0.0 })
  currentBottleRemainingMl: number;

  @Column({ type: 'int', default: 30 })
  standardPourMl: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  costPerBottle: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  pricePerPour: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  pricePerBottle: number;

  @Column({ type: 'int', default: 2 })
  parLevelBottles: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
