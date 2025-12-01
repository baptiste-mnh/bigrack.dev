/*
 * Copyright 2025 BigRack.dev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { loadConfig } from '../config';
import { logger } from '../logger';
import * as os from 'os';

/**
 * Embedding service that generates vector embeddings for text using local transformer models
 *
 * This service uses @xenova/transformers to run models locally without external API calls,
 * ensuring privacy and zero-cost operation.
 */
export class EmbeddingService {
  private pipeline: FeatureExtractionPipeline | null = null;
  private modelName: string;
  private modelPath: string;
  private dimensions: number;
  private isInitialized = false;

  constructor() {
    const config = loadConfig();
    this.modelName = config.vectorSearch.modelName;
    this.modelPath = config.vectorSearch.modelPath.replace('~', os.homedir());
    this.dimensions = config.vectorSearch.embeddingDimensions;
  }

  /**
   * Initialize the embedding model
   * Downloads the model if not cached, then loads it into memory
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Embedding service already initialized');
      return;
    }

    try {
      logger.debug(`Loading embedding model: ${this.modelName}`);

      // Set cache directory for models
      process.env.TRANSFORMERS_CACHE = this.modelPath;

      // Load the feature extraction pipeline
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        cache_dir: this.modelPath,
        local_files_only: false, // Allow downloads if not cached
      });

      this.isInitialized = true;
      logger.debug(`Embedding model loaded successfully (${this.dimensions} dimensions)`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize embedding service');
      throw new Error(`Embedding service initialization failed: ${error}`);
    }
  }

  /**
   * Generate embedding vector for a single text
   * @param text - Input text to embed
   * @returns Vector embedding as number array
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize();
    }

    try {
      // Generate embedding
      const result = await this.pipeline!(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding vector from the result
      const embedding = Array.from(result.data) as number[];

      logger.debug(`Generated embedding for text (${embedding.length} dimensions)`);
      return embedding;
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate embedding');
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * More efficient than calling embed() multiple times
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize();
    }

    try {
      logger.debug(`Generating ${texts.length} embeddings in batch`);

      const embeddings = await Promise.all(texts.map((text) => this.embed(text)));

      return embeddings;
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate batch embeddings');
      throw new Error(`Batch embedding generation failed: ${error}`);
    }
  }

  /**
   * Get the dimension size of embeddings produced by this model
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Get the model name currently in use
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Check if the service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.pipeline) {
      await this.pipeline.dispose?.();
      this.pipeline = null;
      this.isInitialized = false;
      logger.info('Embedding service disposed');
    }
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

/**
 * Get or create the singleton embedding service instance
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}

/**
 * Helper function to generate a single embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const service = getEmbeddingService();
  return service.embed(text);
}

/**
 * Helper function to generate multiple embeddings
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const service = getEmbeddingService();
  return service.embedBatch(texts);
}
