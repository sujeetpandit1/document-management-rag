import { IsOptional, IsInt, Min, IsString, IsIn } from "class-validator";

export class GetUsersDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number = 1;
  
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number = 10;
  
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc' = 'asc';
  }
  