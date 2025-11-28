/**
 * Type declarations for colorthief package
 * @see https://github.com/lokesh/color-thief
 */

declare module "colorthief" {
  type RGBColor = [number, number, number];
  
  interface ColorThief {
    /**
     * Get the dominant color from an image URL
     * @param sourceImage - URL to the image
     * @param quality - Quality setting (1 is highest, 10 is default)
     * @returns RGB color array
     */
    getColor(sourceImage: string, quality?: number): Promise<RGBColor>;
    
    /**
     * Get a color palette from an image URL
     * @param sourceImage - URL to the image
     * @param colorCount - Number of colors to return (default 10)
     * @param quality - Quality setting (1 is highest, 10 is default)
     * @returns Array of RGB color arrays
     */
    getPalette(sourceImage: string, colorCount?: number, quality?: number): Promise<RGBColor[]>;
  }
  
  const ColorThief: ColorThief;
  export default ColorThief;
}

