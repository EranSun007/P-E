import { base44 } from './base44Client';

// Provide empty mocks for integrations to avoid errors after migration
export const Core = {};
export const InvokeLLM = async () => { throw new Error('LLM integration not available in local mode'); };
export const SendEmail = async () => { throw new Error('Email integration not available in local mode'); };
export const UploadFile = async () => { throw new Error('File upload not available in local mode'); };
export const GenerateImage = async () => { throw new Error('Image generation not available in local mode'); };
export const ExtractDataFromUploadedFile = async () => { throw new Error('File extraction not available in local mode'); };






