export class TagResponseDto {
  id: number;
  name: string;

  constructor(partial: Partial<TagResponseDto>) {
    Object.assign(this, partial);
  }
}

