# Quickbrush for Obsidian

Generate AI-powered images from your Obsidian notes using your OpenAI API key (BYOK). Create character portraits, scenes, creatures, and items with a few clicks.

**A tool by Wizzlethorpe Labs.**

## Features

- **Bring Your Own Key (BYOK)**: Uses your own OpenAI API key - you only pay for what you use
- **Four Generation Types**: Character, Scene, Creature, and Item images
- **Smart Text Extraction**: Automatically extracts content from your active note
- **Reference Images**: Support for up to 3 reference images automatically extracted from your notes
- **Quality Options**: Choose from Low, Medium, or High quality
- **Multiple Aspect Ratios**: Square, Landscape, or Portrait
- **Organized Storage**: All files organized in a single parent folder:
  - Images saved to `Quickbrush/quickbrush-images`
  - Gallery notes in `Quickbrush/quickbrush-gallery`
- **Gallery Notes**: Each generation creates a timestamped note with:
  - Embedded image
  - Generation metadata (type, quality, aspect ratio, etc.)
  - Original and refined descriptions

## Installation

### From Source

1. Clone or download this plugin to your vault's `.obsidian/plugins/quickbrush/` folder
2. Run `npm install` in the plugin directory
3. Run `npm run build` to compile the plugin
4. Enable the plugin in Obsidian's Community Plugins settings

### Manual Installation

1. Create a folder named `quickbrush` in your vault's `.obsidian/plugins/` directory
2. Copy `main.js`, `manifest.json`, and `styles.css` into the folder
3. Enable the plugin in Obsidian's Community Plugins settings

## Setup

1. Get your OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Open Settings → QuickBrush
3. Enter your OpenAI API key
4. (Optional) Choose your preferred image model (gpt-image-1-mini is recommended)
5. (Optional) Customize the parent folder name (default: "Quickbrush")
   - Images will be saved to: `{folder}/quickbrush-images`
   - Gallery notes will be saved to: `{folder}/quickbrush-gallery`

## Usage

### Generate from Active Note

1. Open any note in Obsidian
2. Use one of these methods:
   - Click the QuickBrush ribbon icon
   - Open Command Palette (Ctrl/Cmd+P) and search for "QuickBrush"
   - Use a specific command:
     - "QuickBrush: Generate Character Image"
     - "QuickBrush: Generate Scene Image"
     - "QuickBrush: Generate Creature Image"
     - "QuickBrush: Generate Item Image"

3. The plugin will automatically extract text from your note (excluding frontmatter)
4. The first 3 images embedded in your note will be automatically selected as reference images
5. Adjust the description, type, quality, and aspect ratio as needed
6. Click "Generate"

### Reference Images

The plugin supports up to 3 reference images to guide the generation:

- **Auto-Selected**: The first 3 images from your active note are automatically extracted
- **Remove Images**: Click the × button on any thumbnail to remove it
- **Supported Formats**: PNG, JPG, JPEG, GIF, WebP, BMP

Reference images help maintain consistency with existing artwork or provide visual style guidance.

### Generation Options

**Generation Types:**
- **Character**: For character portraits and NPCs (default: square)
- **Scene**: For locations, environments, and scenes (default: landscape)
- **Creature**: For monsters, beasts, and creatures (default: square)
- **Item**: For equipment, artifacts, and items (default: square)

**Quality Levels:**
- **Low**: Faster generation, lower cost
- **Medium**: Balanced quality and cost (recommended)
- **High**: Best quality, higher cost

**Aspect Ratios:**
- **Square**: 1024x1024 (general purpose)
- **Landscape**: 1536x1024 (wide scenes)
- **Portrait**: 1024x1536 (tall compositions)

## Gallery Notes

Each generated image creates a gallery note with this structure:

```markdown
---
generation_type: character
quality: high
aspect_ratio: square
created: 2025-01-15T10:30:00.000Z
---

# Character Name

![[quickbrush-images/Character-Name-12345678.png]]

## Generation Details

**Type:** character
**Quality:** high
**Aspect Ratio:** square

## Original Description

Your original description...

## Refined Description

AI-enhanced description...

## Prompt

Optional context prompt
```

Gallery notes are automatically named with timestamps for chronological ordering.

## Settings

- **OpenAI API Key**: Your OpenAI API key from platform.openai.com
- **Image Model**: Choose between gpt-image-1-mini (recommended) or gpt-image-1 (higher quality)
- **QuickBrush Folder**: Parent folder for all QuickBrush files (default: `Quickbrush`)
  - Images: `{folder}/quickbrush-images`
  - Gallery: `{folder}/quickbrush-gallery`

## Pricing

QuickBrush uses your OpenAI API key, so you only pay for what you use:

- **gpt-image-1-mini**: ~$0.01-0.05 per image (recommended)
- **gpt-image-1**: ~$0.03-0.15 per image (higher quality)

Actual costs depend on quality settings and whether you use reference images. Check [OpenAI's pricing page](https://openai.com/pricing) for current rates.

## Example Workflow

1. Create a character note:
```markdown
---
name: Elara Moonwhisper
race: Elf
class: Wizard
---

# Elara Moonwhisper

A wise elf wizard with silver hair and piercing blue eyes.
She wears flowing robes adorned with celestial symbols and
carries an ancient staff topped with a glowing crystal.
```

2. Run "QuickBrush: Generate Character Image"
3. The plugin extracts the description automatically
4. Optionally add a context prompt like "smiling, wearing a blue dress"
5. Click Generate
6. Image appears in `quickbrush-images/` and a gallery note is created in `quickbrush-gallery/`

## Troubleshooting

**"OpenAI API Key Required"**
- You need to configure your OpenAI API key in Settings → QuickBrush
- Get a key from [platform.openai.com](https://platform.openai.com)

**"Generation failed: [error message]"**
- Check that your API key is valid and has credits
- Ensure your OpenAI account is in good standing
- Check the console (Ctrl+Shift+I) for detailed error messages

**Images not appearing in notes**
- Make sure the image path is correct
- Try using the absolute path or `![[filename.png]]` format

## Support

- GitHub: [wizzlethorpe/quickbrush](https://github.com/wizzlethorpe/quickbrush)
- Report issues: [GitHub Issues](https://github.com/wizzlethorpe/quickbrush/issues)

## License

MIT License - See LICENSE file for details
