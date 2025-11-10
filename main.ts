import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, TFolder, Modal, TextAreaComponent, TextComponent, DropdownComponent } from 'obsidian';
import { OpenAIClient, createGenerator } from '@quickbrush/core';

interface QuickBrushSettings {
	openaiApiKey: string;
	imageModel: 'gpt-image-1' | 'gpt-image-1-mini';
	quickbrushFolder: string;
}

const DEFAULT_SETTINGS: QuickBrushSettings = {
	openaiApiKey: '',
	imageModel: 'gpt-image-1-mini',
	quickbrushFolder: 'Quickbrush'
};

interface GenerationOptions {
	text: string;
	image_name: string;
	prompt?: string;
	generation_type: 'character' | 'scene' | 'creature' | 'item';
	quality: 'low' | 'medium' | 'high';
	aspect_ratio: 'square' | 'landscape' | 'portrait';
	reference_images?: string[]; // base64 data URIs
}

export default class QuickBrushPlugin extends Plugin {
	settings: QuickBrushSettings;

	// Helper methods to get derived folder paths
	getImagesFolder(): string {
		return `${this.settings.quickbrushFolder}/quickbrush-images`;
	}

	getGalleryFolder(): string {
		return `${this.settings.quickbrushFolder}/quickbrush-gallery`;
	}

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('image-plus', 'QuickBrush', () => {
			this.openGenerateModal();
		});

		// Add commands for each generation type
		this.addCommand({
			id: 'generate-character',
			name: 'Generate Character Image',
			callback: () => {
				this.openGenerateModal('character');
			}
		});

		this.addCommand({
			id: 'generate-scene',
			name: 'Generate Scene Image',
			callback: () => {
				this.openGenerateModal('scene');
			}
		});

		this.addCommand({
			id: 'generate-creature',
			name: 'Generate Creature Image',
			callback: () => {
				this.openGenerateModal('creature');
			}
		});

		this.addCommand({
			id: 'generate-item',
			name: 'Generate Item Image',
			callback: () => {
				this.openGenerateModal('item');
			}
		});

		// Add settings tab
		this.addSettingTab(new QuickBrushSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	openGenerateModal(defaultType?: 'character' | 'scene' | 'creature' | 'item') {
		if (!this.settings.openaiApiKey) {
			new Notice('OpenAI API Key Required: Please set your OpenAI API key in the plugin settings.', 6000);
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		let initialText = '';
		let initialImages: string[] = [];
		let initialName = '';

		if (activeFile) {
			// Get the note title (filename without extension)
			initialName = activeFile.basename;

			this.app.vault.read(activeFile).then(async content => {
				// Extract content without frontmatter
				initialText = this.extractContentWithoutFrontmatter(content);

				// Extract first 4 images from the note
				const imagePaths = this.extractImagePaths(content);

				// Convert images to base64
				for (const imagePath of imagePaths) {
					const base64 = await this.resolveImageToBase64(imagePath);
					if (base64) {
						initialImages.push(base64);
					}
				}

				new GenerateModal(this.app, this, initialText, initialImages, initialName, defaultType).open();
			});
		} else {
			new GenerateModal(this.app, this, initialText, initialImages, initialName, defaultType).open();
		}
	}

	extractContentWithoutFrontmatter(content: string): string {
		// Remove YAML frontmatter
		const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
		let text = content.replace(frontmatterRegex, '');

		// Remove markdown formatting for cleaner text
		text = text
			.replace(/!\[\[.*?\]\]/g, '') // Remove image embeds
			.replace(/\[\[(.*?)\]\]/g, '$1') // Convert wiki links to text
			.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert markdown links to text
			.replace(/^#{1,6}\s+/gm, '') // Remove headers
			.replace(/\*\*/g, '') // Remove bold
			.replace(/\*/g, '') // Remove italic
			.replace(/^[-*+]\s+/gm, '') // Remove list markers
			.trim();

		// Limit to 10000 characters
		if (text.length > 10000) {
			text = text.substring(0, 10000);
		}

		return text;
	}

	extractImagePaths(content: string): string[] {
		const images: string[] = [];

		// Extract wiki-link image embeds: ![[image.png]]
		const wikiImageRegex = /!\[\[([^\]]+\.(png|jpg|jpeg|gif|webp|bmp))\]\]/gi;
		let match;
		while ((match = wikiImageRegex.exec(content)) !== null && images.length < 4) {
			images.push(match[1]);
		}

		// If we need more, extract markdown image embeds: ![alt](image.png)
		if (images.length < 4) {
			const mdImageRegex = /!\[[^\]]*\]\(([^\)]+\.(png|jpg|jpeg|gif|webp|bmp))\)/gi;
			while ((match = mdImageRegex.exec(content)) !== null && images.length < 4) {
				images.push(match[1]);
			}
		}

		return images;
	}

	async resolveImageToBase64(imagePath: string): Promise<string | null> {
		try {
			// Try to find the file in the vault
			const file = this.app.metadataCache.getFirstLinkpathDest(imagePath, '');
			if (!file || !(file instanceof TFile)) {
				return null;
			}

			// Read the file as binary
			const arrayBuffer = await this.app.vault.readBinary(file);

			// Convert to base64
			const base64 = this.arrayBufferToBase64(arrayBuffer);

			// Determine mime type from extension
			const ext = file.extension.toLowerCase();
			const mimeTypes: { [key: string]: string } = {
				'png': 'image/png',
				'jpg': 'image/jpeg',
				'jpeg': 'image/jpeg',
				'gif': 'image/gif',
				'webp': 'image/webp',
				'bmp': 'image/bmp'
			};
			const mimeType = mimeTypes[ext] || 'image/png';

			return `data:${mimeType};base64,${base64}`;
		} catch (error) {
			console.error(`Failed to resolve image ${imagePath}:`, error);
			return null;
		}
	}

	arrayBufferToBase64(buffer: ArrayBuffer): string {
		let binary = '';
		const bytes = new Uint8Array(buffer);
		const len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return window.btoa(binary);
	}

	async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	async generateImage(options: GenerationOptions): Promise<{ imageBlob: Blob; description: string }> {
		try {
			// Create OpenAI client
			const client = new OpenAIClient(this.settings.openaiApiKey);

			// Create generator for the specified type
			const generator = createGenerator(options.generation_type, client);

			// Get description from text
			const descriptionResult = await generator.getDescription(
				options.text,
				options.prompt,
				options.reference_images || []
			);

			// Generate image
			const imageBlob = await generator.generateImage({
				description: descriptionResult.text,
				referenceImages: options.reference_images || [],
				model: this.settings.imageModel,
				quality: options.quality,
				aspectRatio: options.aspect_ratio
			});

			return {
				imageBlob,
				description: descriptionResult.text
			};
		} catch (error) {
			console.error('QuickBrush generation error:', error);
			if (error instanceof Error) {
				throw new Error(`Generation failed: ${error.message}`);
			}
			throw new Error('Generation failed: Unknown error');
		}
	}

	async saveImageToVault(imageBlob: Blob, imageName?: string): Promise<string> {
		const imagesFolder = this.getImagesFolder();
		await this.ensureFolderExists(imagesFolder);

		// Generate timestamp suffix for unique filenames
		const timestamp = Date.now();

		// Use image name if available, otherwise use timestamp
		let filename: string;
		if (imageName) {
			// Sanitize the image name for use as filename
			const sanitized = imageName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
			filename = `${sanitized}-${timestamp}.png`;
		} else {
			filename = `quickbrush-${timestamp}.png`;
		}

		const filepath = `${imagesFolder}/${filename}`;

		// Convert Blob to ArrayBuffer
		const arrayBuffer = await imageBlob.arrayBuffer();
		await this.app.vault.createBinary(filepath, arrayBuffer);

		return filepath;
	}

	async createGalleryNote(
		filepath: string,
		generationType: string,
		description: string,
		refinedDescription: string,
		prompt: string,
		quality: string,
		aspectRatio: string,
		imageName: string
	): Promise<void> {
		const galleryFolder = this.getGalleryFolder();
		await this.ensureFolderExists(galleryFolder);

		// Generate a unique filename based on image name + timestamp
		const timestamp = Date.now();
		const sanitizedName = imageName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
		const noteFilename = `${sanitizedName}-${timestamp}.md`;
		const noteFilepath = `${galleryFolder}/${noteFilename}`;

		// Format the gallery note content
		const noteContent = `---
generation_type: ${generationType}
quality: ${quality}
aspect_ratio: ${aspectRatio}
created: ${new Date().toISOString()}
---

# ${imageName}

![[${filepath.split('/').pop()}]]

## Generation Details

**Type:** ${generationType}
**Quality:** ${quality}
**Aspect Ratio:** ${aspectRatio}

## Original Description

${description}

## Refined Description

${refinedDescription}

${prompt ? `## Prompt\n\n${prompt}` : ''}
`;

		await this.app.vault.create(noteFilepath, noteContent);
	}
}

class GenerateModal extends Modal {
	plugin: QuickBrushPlugin;
	initialText: string;
	initialImages: string[];
	initialName: string;
	defaultType?: string;

	textInput: TextAreaComponent;
	promptInput: TextAreaComponent;
	nameInput: TextComponent;
	typeDropdown: DropdownComponent;
	qualityDropdown: DropdownComponent;
	aspectRatioDropdown: DropdownComponent;

	referenceImages: string[] = [];

	constructor(app: App, plugin: QuickBrushPlugin, initialText: string, initialImages: string[], initialName: string, defaultType?: string) {
		super(app);
		this.plugin = plugin;
		this.initialText = initialText;
		this.initialImages = initialImages;
		this.initialName = initialName;
		this.defaultType = defaultType;
		this.referenceImages = initialImages;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Generate QuickBrush Image' });

		// Image Name
		new Setting(contentEl)
			.setName('Image Name')
			.setDesc('A name for the generated image')
			.addText(text => {
				this.nameInput = text;
				text.setValue(this.initialName)
					.setPlaceholder('My Character');
			});

		// Generation Type
		new Setting(contentEl)
			.setName('Type')
			.setDesc('The type of image to generate')
			.addDropdown(dropdown => {
				this.typeDropdown = dropdown;
				dropdown.addOption('character', 'Character');
				dropdown.addOption('scene', 'Scene');
				dropdown.addOption('creature', 'Creature');
				dropdown.addOption('item', 'Item');
				dropdown.setValue(this.defaultType || 'character');

				// Auto-adjust aspect ratio based on type
				dropdown.onChange(value => {
					if (value === 'scene') {
						this.aspectRatioDropdown.setValue('landscape');
					} else {
						this.aspectRatioDropdown.setValue('square');
					}
				});
			});

		// Text Input
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Describe what you want to generate (can be long-form text)')
			.addTextArea(text => {
				this.textInput = text;
				text.setValue(this.initialText)
					.setPlaceholder('A brave knight with golden armor and a red cape...')
					.inputEl.rows = 8;
				text.inputEl.style.width = '100%';
			});

		// Prompt Input
		new Setting(contentEl)
			.setName('Focus Prompt (Optional)')
			.setDesc('Specific details to focus on (e.g., "wearing a blue dress", "holding a sword")')
			.addTextArea(text => {
				this.promptInput = text;
				text.setPlaceholder('Wearing a blue dress and holding a magical staff')
					.inputEl.rows = 3;
				text.inputEl.style.width = '100%';
			});

		// Reference Images
		const refImagesSetting = new Setting(contentEl)
			.setName('Reference Images')
			.setDesc(`${this.referenceImages.length}/4 images selected`);

		const refImagesContainer = contentEl.createDiv({ cls: 'quickbrush-ref-images' });
		this.renderReferenceImages(refImagesContainer);

		// Quality
		new Setting(contentEl)
			.setName('Quality')
			.setDesc('Image quality (higher quality costs more)')
			.addDropdown(dropdown => {
				this.qualityDropdown = dropdown;
				dropdown.addOption('low', 'Low');
				dropdown.addOption('medium', 'Medium');
				dropdown.addOption('high', 'High');
				dropdown.setValue('high');
			});

		// Aspect Ratio
		new Setting(contentEl)
			.setName('Aspect Ratio')
			.setDesc('Image dimensions')
			.addDropdown(dropdown => {
				this.aspectRatioDropdown = dropdown;
				dropdown.addOption('square', 'Square (1024x1024)');
				dropdown.addOption('landscape', 'Landscape (1536x1024)');
				dropdown.addOption('portrait', 'Portrait (1024x1536)');
				dropdown.setValue('square');
			});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'quickbrush-button-container' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '20px';

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const generateBtn = buttonContainer.createEl('button', { text: 'Generate', cls: 'mod-cta' });
		generateBtn.addEventListener('click', () => this.handleGenerate());
	}

	renderReferenceImages(container: HTMLElement) {
		container.empty();

		if (this.referenceImages.length > 0) {
			this.referenceImages.forEach((imgBase64, index) => {
				const imgWrapper = container.createDiv({ cls: 'quickbrush-ref-image-wrapper' });
				imgWrapper.style.display = 'inline-block';
				imgWrapper.style.position = 'relative';
				imgWrapper.style.margin = '5px';

				const img = imgWrapper.createEl('img', { attr: { src: imgBase64 } });
				img.style.width = '100px';
				img.style.height = '100px';
				img.style.objectFit = 'cover';

				const removeBtn = imgWrapper.createEl('button', { cls: 'quickbrush-ref-image-remove', text: '×' });
				removeBtn.style.position = 'absolute';
				removeBtn.style.top = '0';
				removeBtn.style.right = '0';
				removeBtn.addEventListener('click', () => {
					this.referenceImages.splice(index, 1);
					this.renderReferenceImages(container);
				});
			});

			if (this.referenceImages.length < 4) {
				const note = container.createDiv({ cls: 'quickbrush-ref-image-note' });
				note.textContent = 'Images from the active note are automatically included.';
				note.style.fontSize = '0.9em';
				note.style.color = 'var(--text-muted)';
			}
		} else {
			const note = container.createDiv({ cls: 'quickbrush-ref-image-note' });
			note.textContent = 'No reference images. Include images in your note to use them as references.';
			note.style.fontSize = '0.9em';
			note.style.color = 'var(--text-muted)';
		}
	}

	async handleGenerate() {
		const text = this.textInput.getValue().trim();
		const imageName = this.nameInput.getValue().trim() || 'Untitled';
		const prompt = this.promptInput.getValue().trim();
		const generationType = this.typeDropdown.getValue() as 'character' | 'scene' | 'creature' | 'item';
		const quality = this.qualityDropdown.getValue() as 'low' | 'medium' | 'high';
		const aspectRatio = this.aspectRatioDropdown.getValue() as 'square' | 'landscape' | 'portrait';

		if (!text) {
			new Notice('Please provide a description');
			return;
		}

		// Close modal and show progress notice
		this.close();
		const progressNotice = new Notice('Generating image...', 0);

		try {
			// Generate the image
			const result = await this.plugin.generateImage({
				text,
				image_name: imageName,
				prompt,
				generation_type: generationType,
				quality,
				aspect_ratio: aspectRatio,
				reference_images: this.referenceImages
			});

			progressNotice.setMessage('Saving image...');

			// Save to vault
			const filepath = await this.plugin.saveImageToVault(result.imageBlob, imageName);

			// Create gallery note
			await this.plugin.createGalleryNote(
				filepath,
				generationType,
				text,
				result.description,
				prompt,
				quality,
				aspectRatio,
				imageName
			);

			progressNotice.hide();
			new Notice(`Image generated successfully: ${imageName}`);

			// Open the gallery note
			const galleryFolder = this.plugin.getGalleryFolder();
			const files = this.app.vault.getMarkdownFiles();
			const galleryNote = files.find(f => f.path.startsWith(galleryFolder) && f.basename.includes(imageName));
			if (galleryNote) {
				this.app.workspace.getLeaf().openFile(galleryNote);
			}

		} catch (error) {
			progressNotice.hide();
			console.error('QuickBrush generation error:', error);
			if (error instanceof Error) {
				new Notice(`Generation failed: ${error.message}`, 8000);
			} else {
				new Notice('QuickBrush: Generation failed with an unknown error', 8000);
			}
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class QuickBrushSettingTab extends PluginSettingTab {
	plugin: QuickBrushPlugin;

	constructor(app: App, plugin: QuickBrushPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'QuickBrush Settings' });

		// OpenAI API Key
		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Your OpenAI API key for image generation (get one at platform.openai.com)')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				})
				.inputEl.type = 'password'
			);

		// Image Model
		new Setting(containerEl)
			.setName('Image Model')
			.setDesc('Which OpenAI image model to use (gpt-image-1 is higher quality but more expensive)')
			.addDropdown(dropdown => dropdown
				.addOption('gpt-image-1-mini', 'GPT-Image-1-Mini (Recommended)')
				.addOption('gpt-image-1', 'GPT-Image-1 (Higher Quality)')
				.setValue(this.plugin.settings.imageModel)
				.onChange(async (value) => {
					this.plugin.settings.imageModel = value as 'gpt-image-1' | 'gpt-image-1-mini';
					await this.plugin.saveSettings();
				})
			);

		// QuickBrush Folder
		new Setting(containerEl)
			.setName('QuickBrush Folder')
			.setDesc('Parent folder for all QuickBrush files (images and gallery)')
			.addText(text => text
				.setPlaceholder('Quickbrush')
				.setValue(this.plugin.settings.quickbrushFolder)
				.onChange(async (value) => {
					this.plugin.settings.quickbrushFolder = value;
					await this.plugin.saveSettings();
				})
			);

		const folderInfo = containerEl.createDiv({ cls: 'quickbrush-folder-info' });
		folderInfo.style.fontSize = '0.9em';
		folderInfo.style.color = 'var(--text-muted)';
		folderInfo.style.marginTop = '10px';
		folderInfo.innerHTML = `
			<p><strong>Folder Structure:</strong></p>
			<ul>
				<li><code>${this.plugin.getImagesFolder()}</code> - Generated images</li>
				<li><code>${this.plugin.getGalleryFolder()}</code> - Gallery notes with metadata</li>
			</ul>
		`;

		// Help text
		const helpText = containerEl.createDiv({ cls: 'quickbrush-help-text' });
		helpText.style.marginTop = '20px';
		helpText.style.padding = '10px';
		helpText.style.backgroundColor = 'var(--background-secondary)';
		helpText.style.borderRadius = '5px';

		const helpP1 = helpText.createEl('p');
		helpP1.innerHTML = 'QuickBrush now uses your own OpenAI API key (BYOK). Get an API key from ';
		helpP1.createEl('a', { text: 'platform.openai.com', href: 'https://platform.openai.com' });
		helpP1.innerHTML += '.';

		helpText.createEl('p', { text: 'You only pay for what you use. Image generation costs a few cents per image depending on quality and model.' });
	}
}
