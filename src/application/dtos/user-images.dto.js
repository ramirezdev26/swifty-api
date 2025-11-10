export class UserImageResponseDTO {
  constructor({
    id,
    processed_url,
    style,
    project_name = null,
    processed_at,
    visibility = 'public',
  }) {
    this.id = id;
    this.processed_url = processed_url;
    this.style = style;
    this.project_name = project_name;
    this.processed_at = processed_at;
    this.visibility = visibility;
  }

  toJSON() {
    return {
      id: this.id,
      processed_url: this.processed_url,
      style: this.style,
      project_name: this.project_name,
      processed_at: this.processed_at,
      visibility: this.visibility,
    };
  }
}

export class UserImagesResponseDTO {
  constructor({ images, pagination }) {
    this.images = images;
    this.pagination = pagination;
  }

  toJSON() {
    return {
      images: this.images.map((image) => (image.toJSON ? image.toJSON() : image)),
      pagination: this.pagination,
    };
  }
}
