type LanguageTag = {
  code: string;
  script: string | null;
  region: string | null;
  quality: number;
};

const regex = /((([a-zA-Z]+(-[a-zA-Z0-9]+){0,2})|\*)(;q=[0-1](\.[0-9]+)?)?)*/g;

function parse(al: string): LanguageTag[] {
  const strings = al.match(regex) ?? [];
  return strings.map((m) => {
    if (!m) {
      return undefined;
    }

    const bits = m.split(';');
    const ietf = bits[0].split('-');
    const hasScript = ietf.length === 3;

    return {
      code: ietf[0],
      script: hasScript ? ietf[1] : null,
      region: hasScript ? ietf[2] : ietf[1],
      quality: bits[1] ? parseFloat(bits[1].split('=')[1]) : 1.0,
    };
  }).filter((r): r is LanguageTag => Boolean(r))
    .sort((a, b) => b.quality - a.quality);
}

function pick(supportedLanguages: string[], acceptLanguage: string | LanguageTag[], options?: { loose?: boolean }): string | null {
  options = options || {};

  if (!supportedLanguages.length || !acceptLanguage) {
    return null;
  }

  const acceptLangTags = typeof acceptLanguage === 'string' ? parse(acceptLanguage) : acceptLanguage;

  const supported = supportedLanguages.map((support) => {
    const bits = support.split('-');
    const hasScript = bits.length === 3;

    return {
      code: bits[0],
      script: hasScript ? bits[1] : null,
      region: hasScript ? bits[2] : bits[1],
    };
  });

  for (const lang of acceptLangTags) {
    const langCode = lang.code.toLowerCase();
    const langRegion = lang.region?.toLowerCase();
    const langScript = lang.script?.toLowerCase();
    for (const [index, supportedTag] of supported.entries()) {
      const supportedCode = supportedTag.code.toLowerCase();
      const supportedScript = supportedTag.script?.toLowerCase();
      const supportedRegion = supportedTag.region?.toLowerCase();
      if (langCode === supportedCode &&
        (options.loose || !langScript || langScript === supportedScript) &&
        (options.loose || !langRegion || langRegion === supportedRegion)) {
        return supportedLanguages[index];
      }
    }
  }

  return null;
}

export { parse, pick };
