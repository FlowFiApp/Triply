declare module "@nimiq/identicons" {
  const Identicons: {
    svg(input: string): Promise<string>;
    toDataUrl(input: string): Promise<string>;
    image(input: string): Promise<HTMLImageElement>;
    placeholder(color?: string, width?: number): string;
    placeholderToDataUrl(color?: string, width?: number): string;
  };
  export const IdenticonsAssets: string;
  export default Identicons;
}