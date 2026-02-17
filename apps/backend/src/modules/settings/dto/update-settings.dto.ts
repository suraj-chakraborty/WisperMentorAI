
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LlmConfigDto {
    @IsString()
    provider!: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama';

    @IsOptional()
    @IsString()
    apiKey?: string;

    @IsOptional()
    @IsString()
    model?: string;
}

export class UpdateSettingsDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => LlmConfigDto)
    llm?: LlmConfigDto;
}
