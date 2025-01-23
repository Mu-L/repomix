import type { RepomixConfigMerged } from '../config/configSchema.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles } from './file/fileCollect.js';
import { processFiles } from './file/fileProcess.js';
import { searchFiles } from './file/fileSearch.js';
import { calculateMetrics } from './metrics/calculateMetrics.js';
import { generateOutput } from './output/outputGenerate.js';
import { copyToClipboardIfEnabled } from './packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from './packager/writeOutputToDisk.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';

export interface PackResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  suspiciousFilesResults: SuspiciousFileResult[];
}

export const pack = async (
  rootDir: string,
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  deps = {
    searchFiles,
    collectFiles,
    processFiles,
    generateOutput,
    validateFileSafety,
    writeOutputToDisk,
    copyToClipboardIfEnabled,
    calculateMetrics,
  },
): Promise<PackResult> => {
  progressCallback('Searching for files...');
  const { filePaths } = await deps.searchFiles(rootDir, config);

  progressCallback('Collecting files...');
  const rawFiles = await deps.collectFiles(filePaths, rootDir, progressCallback);

  const { safeFilePaths, safeRawFiles, suspiciousFilesResults } = await deps.validateFileSafety(
    rawFiles,
    progressCallback,
    config,
  );

  // Process files (remove comments, etc.)
  progressCallback('Processing files...');
  const processedFiles = await deps.processFiles(safeRawFiles, config, progressCallback);

  progressCallback('Generating output...');
  const output = await deps.generateOutput(rootDir, config, processedFiles, safeFilePaths);

  progressCallback('Writing output file...');
  await deps.writeOutputToDisk(output, config);

  await deps.copyToClipboardIfEnabled(output, progressCallback, config);

  const metrics = await deps.calculateMetrics(processedFiles, output, progressCallback, config);

  return {
    ...metrics,
    suspiciousFilesResults,
  };
};
