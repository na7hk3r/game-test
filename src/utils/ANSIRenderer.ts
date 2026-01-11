import Phaser from 'phaser';

// ANSI color palette (CGA colors - 16 colors)
const ANSI_PALETTE = [
  '#000000', '#aa0000', '#00aa00', '#aa5500',
  '#0000aa', '#aa00aa', '#00aaaa', '#aaaaaa',
  '#555555', '#ff5555', '#55ff55', '#ffff55',
  '#5555ff', '#ff55ff', '#55ffff', '#ffffff',
];

/**
 * Block character types for pixel-based rendering
 * We draw blocks as colored rectangles instead of using fonts
 */
enum BlockType {
  EMPTY = 0,
  FULL = 1,
  TOP_HALF = 2,
  BOTTOM_HALF = 3,
  LEFT_HALF = 4,
  RIGHT_HALF = 5,
  SHADE_LIGHT = 6,
  SHADE_MEDIUM = 7,
  SHADE_DARK = 8,
}

interface ParsedCell {
  blockType: BlockType;
  fg: number;
  bg: number;
}

/**
 * Map CP437 byte to block type
 */
function getBlockType(byte: number): BlockType {
  switch (byte) {
    case 32:  return BlockType.EMPTY;        // Space
    case 219: return BlockType.FULL;         // █
    case 220: return BlockType.BOTTOM_HALF;  // ▄
    case 221: return BlockType.LEFT_HALF;    // ▌
    case 222: return BlockType.RIGHT_HALF;   // ▐
    case 223: return BlockType.TOP_HALF;     // ▀
    case 176: return BlockType.SHADE_LIGHT;  // ░
    case 177: return BlockType.SHADE_MEDIUM; // ▒
    case 178: return BlockType.SHADE_DARK;   // ▓
    case 254: return BlockType.FULL;         // ■
    default:
      // Any visible character becomes a full block
      if (byte > 32) return BlockType.FULL;
      return BlockType.EMPTY;
  }
}

/**
 * ANSIRenderer - Renders CP437/ANSI art to Phaser textures
 * Uses pixel-based rendering (no fonts) for consistent display
 */
export class ANSIRenderer {

  /**
   * Parse binary ANSI data with escape sequence handling
   * Supports both newline-delimited and fixed-width (80 columns) formats
   */
  private parseBytes(data: Uint8Array): { width: number; height: number; cells: ParsedCell[][] } {
    const cells: ParsedCell[][] = [];
    let currentRow: ParsedCell[] = [];
    let fg = 7;   // Default: light gray
    let bg = 0;   // Default: black
    let bold = false;
    let maxWidth = 0;
    const FIXED_WIDTH = 80; // Standard ANSI terminal width
    let hasNewlines = false;

    // Check if file has newlines
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0x0A) {
        hasNewlines = true;
        break;
      }
    }

    // Find and exclude SAUCE metadata (starts with "SAUCE" near end of file)
    let endPos = data.length;
    for (let i = Math.max(0, data.length - 200); i < data.length - 5; i++) {
      // Look for "SAUCE" (0x53 0x41 0x55 0x43 0x45)
      if (data[i] === 0x53 && data[i+1] === 0x41 && data[i+2] === 0x55 && 
          data[i+3] === 0x43 && data[i+4] === 0x45) {
        endPos = i;
        break;
      }
      // Also stop at EOF marker (0x1A)
      if (data[i] === 0x1A) {
        endPos = i;
        break;
      }
    }

    let i = 0;
    while (i < endPos) {
      const byte = data[i];

      // ESC sequence: ESC[ (0x1B 0x5B)
      if (byte === 0x1B && i + 1 < endPos && data[i + 1] === 0x5B) {
        i += 2; // Skip ESC[
        
        // Collect parameters (digits and semicolons)
        let params = '';
        while (i < endPos) {
          const c = data[i];
          // Command letters are 0x40-0x7E (@ through ~)
          if (c >= 0x40 && c <= 0x7E) break;
          params += String.fromCharCode(c);
          i++;
        }
        
        if (i >= endPos) break;
        
        const command = data[i];
        i++;

        // Handle SGR (Select Graphic Rendition) - command 'm'
        if (command === 0x6D) { // 'm'
          const codes = params.split(';').map(s => parseInt(s) || 0);
          for (const code of codes) {
            if (code === 0) {
              // Reset
              fg = 7; bg = 0; bold = false;
            } else if (code === 1) {
              // Bold/bright
              bold = true;
              if (fg < 8) fg += 8;
            } else if (code >= 30 && code <= 37) {
              // Foreground color
              fg = code - 30;
              if (bold) fg += 8;
            } else if (code >= 40 && code <= 47) {
              // Background color
              bg = code - 40;
            } else if (code >= 90 && code <= 97) {
              // Bright foreground
              fg = code - 90 + 8;
            } else if (code >= 100 && code <= 107) {
              // Bright background
              bg = code - 100 + 8;
            }
          }
        }
        // Handle cursor forward - command 'C'
        else if (command === 0x43) { // 'C'
          const count = parseInt(params) || 1;
          for (let j = 0; j < count; j++) {
            currentRow.push({ blockType: BlockType.EMPTY, fg, bg });
          }
        }
        // Other commands (cursor position, etc.) - ignore for now
        
        continue;
      }

      // Newline (LF)
      if (byte === 0x0A) {
        maxWidth = Math.max(maxWidth, currentRow.length);
        cells.push(currentRow);
        currentRow = [];
        i++;
        continue;
      }

      // Carriage return (CR) - skip
      if (byte === 0x0D) {
        i++;
        continue;
      }

      // EOF marker
      if (byte === 0x1A) {
        break;
      }

      // Tab - expand to 8 spaces
      if (byte === 0x09) {
        const spaces = 8 - (currentRow.length % 8);
        for (let j = 0; j < spaces; j++) {
          currentRow.push({ blockType: BlockType.EMPTY, fg, bg });
        }
        i++;
        continue;
      }

      // NULL byte (0x00) - treat as space (common in fixed-width ANSI files)
      if (byte === 0x00) {
        currentRow.push({ blockType: BlockType.EMPTY, fg, bg });
        // Check for fixed-width row break
        if (!hasNewlines && currentRow.length >= FIXED_WIDTH) {
          cells.push(currentRow);
          maxWidth = Math.max(maxWidth, currentRow.length);
          currentRow = [];
        }
        i++;
        continue;
      }

      // Skip other control characters (but not printable ones)
      if (byte < 32) {
        i++;
        continue;
      }

      // Regular character - add to row
      const blockType = getBlockType(byte);
      currentRow.push({ blockType, fg, bg });

      // Check for fixed-width row break
      if (!hasNewlines && currentRow.length >= FIXED_WIDTH) {
        cells.push(currentRow);
        maxWidth = Math.max(maxWidth, currentRow.length);
        currentRow = [];
      }

      i++;
    }

    // Add final row if not empty
    if (currentRow.length > 0) {
      maxWidth = Math.max(maxWidth, currentRow.length);
      cells.push(currentRow);
    }

    console.log(`ANSIRenderer: Parsed ${cells.length} rows, max width ${maxWidth}`);
    return { width: maxWidth, height: cells.length, cells };
  }

  /**
   * Draw a cell as a pixel block
   */
  private drawCell(
    ctx: CanvasRenderingContext2D,
    cell: ParsedCell,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const halfH = Math.floor(h / 2);
    const halfW = Math.floor(w / 2);

    // Draw background (skip black - keep transparent)
    if (cell.bg !== 0) {
      ctx.fillStyle = ANSI_PALETTE[cell.bg];
      ctx.fillRect(x, y, w, h);
    }

    // Draw foreground based on block type
    if (cell.blockType === BlockType.EMPTY) {
      return; // Nothing more to draw
    }

    ctx.fillStyle = ANSI_PALETTE[cell.fg] || '#aaaaaa';

    switch (cell.blockType) {
      case BlockType.FULL:
        ctx.fillRect(x, y, w, h);
        break;

      case BlockType.TOP_HALF:
        ctx.fillRect(x, y, w, halfH);
        break;

      case BlockType.BOTTOM_HALF:
        ctx.fillRect(x, y + halfH, w, h - halfH);
        break;

      case BlockType.LEFT_HALF:
        ctx.fillRect(x, y, halfW, h);
        break;

      case BlockType.RIGHT_HALF:
        ctx.fillRect(x + halfW, y, w - halfW, h);
        break;

      case BlockType.SHADE_LIGHT:
        // 25% shade - sparse pattern
        for (let py = 0; py < h; py += 4) {
          for (let px = ((py / 4) % 2) * 2; px < w; px += 4) {
            ctx.fillRect(x + px, y + py, 1, 1);
          }
        }
        break;

      case BlockType.SHADE_MEDIUM:
        // 50% shade - checkerboard
        for (let py = 0; py < h; py += 2) {
          for (let px = (py % 4 === 0 ? 0 : 1); px < w; px += 2) {
            ctx.fillRect(x + px, y + py, 1, 1);
          }
        }
        break;

      case BlockType.SHADE_DARK:
        // 75% shade - mostly filled with sparse gaps
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = ANSI_PALETTE[cell.bg] || '#000000';
        for (let py = 0; py < h; py += 4) {
          for (let px = ((py / 4) % 2) * 2; px < w; px += 4) {
            ctx.fillRect(x + px, y + py, 1, 1);
          }
        }
        break;
    }
  }

  /**
   * Render ANSI art from binary data to a Phaser texture
   */
  renderFromBytes(
    scene: Phaser.Scene,
    textureKey: string,
    data: Uint8Array,
    targetWidth: number,
    targetHeight: number
  ): void {
    const parsed = this.parseBytes(data);

    if (parsed.width === 0 || parsed.height === 0) {
      console.warn(`ANSIRenderer: No content parsed for ${textureKey}`);
      this.createFallbackTexture(scene, textureKey, targetWidth, targetHeight);
      return;
    }

    // Standard character cell size (8x16 is classic DOS)
    const charW = 8;
    const charH = 16;
    const fullWidth = parsed.width * charW;
    const fullHeight = parsed.height * charH;

    // Create canvas at full resolution
    const canvas = document.createElement('canvas');
    canvas.width = fullWidth;
    canvas.height = fullHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Start with transparent background (don't fill with black)

    // Draw each cell
    for (let row = 0; row < parsed.cells.length; row++) {
      const rowCells = parsed.cells[row];
      for (let col = 0; col < rowCells.length; col++) {
        this.drawCell(ctx, rowCells[col], col * charW, row * charH, charW, charH);
      }
    }

    // Scale to target size
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = targetWidth;
    scaledCanvas.height = targetHeight;

    const scaledCtx = scaledCanvas.getContext('2d')!;
    scaledCtx.imageSmoothingEnabled = false;
    scaledCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    // Add to Phaser textures
    if (scene.textures.exists(textureKey)) {
      scene.textures.remove(textureKey);
    }
    scene.textures.addCanvas(textureKey, scaledCanvas);

    console.log(`ANSIRenderer: Created ${textureKey} (${parsed.width}x${parsed.height} chars -> ${targetWidth}x${targetHeight}px)`);
  }

  /**
   * Create fallback texture when parsing fails
   */
  private createFallbackTexture(
    scene: Phaser.Scene,
    textureKey: string,
    width: number,
    height: number
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#aa00aa';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ff55ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText('?', width / 2 - 3, height / 2 + 3);

    if (scene.textures.exists(textureKey)) {
      scene.textures.remove(textureKey);
    }
    scene.textures.addCanvas(textureKey, canvas);
  }
}
