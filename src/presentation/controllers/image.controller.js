import { ProcessImageCommand } from '../../application/commands/process-image.command.js';

let processImageHandler;
let updateImageVisibilityUseCase;

export function setProcessImageHandler(handler, updateImageVisibility) {
  processImageHandler = handler;
  updateImageVisibilityUseCase = updateImageVisibility;
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

export const updateImageVisibility = async (req, res, next) => {
  try {
    const firebase_uid = req.user.firebase_uid;
    const { id } = req.params;
    const { visibility } = req.body;

    const result = await updateImageVisibilityUseCase.execute(firebase_uid, id, visibility);

    res.status(200).json({
      message: 'Image visibility updated',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
