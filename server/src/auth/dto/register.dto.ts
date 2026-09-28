import { IsNotEmpty, IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(80)
  username: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsString()
  propertyName?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
