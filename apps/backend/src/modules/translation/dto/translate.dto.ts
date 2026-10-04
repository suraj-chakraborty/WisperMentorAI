import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class TranslateDto {
    @IsString()
    @IsNotEmpty()
    text!: string;

    @IsString()
    @IsNotEmpty()
    targetLang!: string;
}

export class BatchTranslateDto {
    @IsArray()
    @IsString({ each: true })
    texts!: string[];

    @IsString()
    @IsNotEmpty()
    targetLang!: string;
}

