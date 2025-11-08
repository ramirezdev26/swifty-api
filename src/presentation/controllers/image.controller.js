import { ProcessImageCommand } from '../../application/commands/process-image.command.js';

let processImageHandler;

export function setProcessImageHandler(handler) {
  processImageHandler = handler;
}

export const processImage = async (req, res, next) => {
  try {
    const { style } = req.body;
    const firebase_uid = req.user.firebase_uid; // From auth middleware
    const imageBuffer = req.file.buffer;
    const fileSize = req.file.size;

    const command = new ProcessImageCommand(firebase_uid, imageBuffer, style, fileSize);
    const result = await processImageHandler.execute(command);

    res.status(202).json({
      message: 'Image is being processed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
