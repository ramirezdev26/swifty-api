export class ProcessImageCommand {
  constructor(firebaseUid, imageBuffer, style, fileSize) {
    this.firebaseUid = firebaseUid;
    this.imageBuffer = imageBuffer;
    this.style = style;
    this.fileSize = fileSize;
  }
}
