import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class ChatRequestDto {
  @IsNotEmpty({ message: 'Message content is required.' })
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['text', 'voice'])
  inputModality?: 'text' | 'voice';

  @IsOptional()
  @IsString()
  currentPage?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class ConfirmActionDto {
  @IsNotEmpty({ message: 'actionConfirmationId is required.' })
  @IsString()
  actionConfirmationId: string;

  @IsNotEmpty({ message: 'Decision is required.' })
  @IsString()
  @IsIn(['CONFIRM', 'REJECT'])
  decision: 'CONFIRM' | 'REJECT';
}

export class SpeechToTextDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  transcript?: string;
}

export class TextToSpeechDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  language?: string;
}
