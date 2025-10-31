const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

async function uploadImage(fileBuffer, fileName, folder = '/') {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder,
    });
    return { url: response.url, fileId: response.fileId }; // Return both URL and fileId
  } catch (error) {
    console.error("Erro ao fazer upload para ImageKit:", error);
    throw new Error("Falha no upload da imagem.");
  }
}

async function deleteImage(fileId) {
  if (!fileId) {
    console.warn("Tentativa de deletar imagem sem fileId fornecido.");
    return true; // Consider it successful if no fileId was provided
  }
  try {
    await imagekit.deleteFile(fileId);
    console.log(`Imagem com fileId ${fileId} deletada do ImageKit.`);
    return true;
  } catch (error) {
    console.error("Erro ao deletar imagem do ImageKit:", error);
    // Do not re-throw the error here, so vehicle deletion can proceed
    return false; // Indicate failure
  }
}

module.exports = { imagekit, uploadImage, deleteImage };