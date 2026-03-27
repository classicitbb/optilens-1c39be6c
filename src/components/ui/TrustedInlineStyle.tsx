type TrustedInlineStyleProps = {
  cssText: string;
};

export function TrustedInlineStyle({ cssText }: TrustedInlineStyleProps) {
  // eslint-disable-next-line no-restricted-syntax -- centralized, reviewed boundary for static CSS text only.
  return <style dangerouslySetInnerHTML={{ __html: cssText }} />;
}
