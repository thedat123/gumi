import { useId } from 'react';

// Team identity palettes, independent of season; no crests or sponsor marks.
const PALETTES: Record<string, { base: string; trim: string; ink: string }> = {
  gam: { base: '#17181b', trim: '#f3c533', ink: '#ffe7a1' },
  tsw: { base: '#102d47', trim: '#38cce3', ink: '#d4f7ff' },
  viking: { base: '#21242c', trim: '#f04c36', ink: '#f6eee7' },
  t1: { base: '#e51c3a', trim: '#17181e', ink: '#fff4ed' },
  geng: { base: '#1b1c20', trim: '#c5a25a', ink: '#efdbab' },
  hle: { base: '#17191c', trim: '#f17b3e', ink: '#9b9fa5' },
  dk: { base: '#55d3bd', trim: '#142523', ink: '#dcfff1' },
  kt: { base: '#e6323b', trim: '#f4f0e9', ink: '#262834' },
  jdg: { base: '#c72c42', trim: '#1b2c4c', ink: '#eee8de' },
  blg: { base: '#267bc5', trim: '#f08fb5', ink: '#e7f7ff' },
  tes: { base: '#ed6432', trim: '#171e27', ink: '#ffe1c3' },
  g2: { base: '#1c1e24', trim: '#ecece7', ink: '#c5c9d1' },
  fnc: { base: '#1c2025', trim: '#ff862f', ink: '#fff0dd' },
};

/** Tonal artwork complements each identity palette; these are original fan colourways. */
function TeamWeave({ id, color }: { id: string; color: string }) {
  const paths: Record<string, string[]> = {
    gam: ['M0 10h20M0 12h20M0 18h20', 'M2 2l3 5 3-5 3 5 3-5 3 5', 'M2 14v2h3v-2h3v2h3v-2h3v2h3'],
    tsw: ['M-5 5Q0 0 5 5T15 5T25 5', 'M-5 10Q0 5 5 10T15 10T25 10', 'M-5 15Q0 10 5 15T15 15T25 15'],
    viking: ['M0 0l10 10L20 0M0 10l10 10 10-10', 'M5 0v5l5 5 5-5V0M5 10v5l5 5 5-5v-5'],
    t1: ['M-3 18L10 3 5 13 22-2', 'M2 22L15 7 10 17 25 2'],
    geng: ['M0 5L5 0l10 10-5 5ZM10 15l5-5 10 10-5 5Z', 'M0 15l5-5 10 10M10 5l5-5 10 10'],
    hle: ['M-4 3Q6-3 12 5T24 5', 'M-4 7Q6 1 12 9T24 9', 'M-4 11Q6 5 12 13T24 13', 'M-4 15Q6 9 12 17T24 17'],
    dk: ['M5 0h10l5 10-5 10H5L0 10Z', 'M7 4h6l4 6-4 6H7l-4-6Z'],
    kt: ['M0 4h13l5-4M0 9h9l7-7M0 14h6l8-8M0 19h3l9-9'],
    jdg: ['M0 0l20 7-7 13Z', 'M0 0l13 20M0 0l7 7 13 0M7 7l6 13M7 7l13 0'],
    blg: ['M1 1h6v6H1ZM11 11h6v6h-6Z', 'M12 2h5v5M2 12v5h5M9 0v4M0 9h4M20 9h-4M9 20v-4'],
    tes: ['M0 2l10 7 10-7M0 7l10 7 10-7M0 12l10 7 10-7'],
    g2: ['M0 0l10 5 10-5M0 10l10-5 10 5-10 5Z', 'M0 10l10 10 10-10M10 5v15'],
    fnc: ['M-3 16L9 0 5 12 17-4', 'M5 24L17 8 13 20 25 4'],
  };
  return <g fill="none" stroke={color} strokeWidth=".45" strokeLinejoin="round">
    {(paths[id] ?? []).map((d, i) => <path key={d} d={d} opacity={i ? .55 : .85} />)}
  </g>;
}

/** Garment coordinates match the sprite's neck and raised paws, rather than a flat shop photo. */
export function Jersey({ id }: { id: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const palette = PALETTES[id];
  if (!palette) return null;
  const { base, trim, ink } = palette;
  const collar = trim;
  const fill = (key: string) => `url(#${uid}-${key})`;
  // Garment reaches under the chin; Gumi's foreground head occludes the hidden neck fabric.
  // Sprite silhouette measured at source rows 510–765: narrow shoulders, round belly, tapered lower hem.
  const silhouette = 'M90 115 Q84 115 79 118 L63 119 Q62 121 64 124 L79 129 Q82 130 83 132 C81 139 80 147 82 153 Q84 161 92 164 Q103 168 114 164 Q123 161 125 153 C127 146 124 138 122 132 Q126 130 130 127 L139 123 Q140 120 137 118 L127 117 Q121 115 116 115 Q103 112 90 115 Z';
  const left = 'M90 118 Q85 116 79 118 L63 119 Q62 121 64 124 L79 129 Q82 130 83 133 Q83 124 90 118 Z';
  const right = 'M116 118 Q121 116 127 117 L137 118 Q140 120 139 123 L130 127 Q126 130 122 132 Q121 124 116 118 Z';
  return <g className="acc-piece jersey-garment">
    <defs>
      <clipPath id={`${uid}-outline`}><path d={silhouette} /></clipPath>
      <radialGradient id={`${uid}-chin-shadow`} cx=".5" cy="0" rx=".65" ry=".9"><stop stopColor="#000" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${uid}-volume`} x1="0" y1="0" x2="1" y2=".08">
        <stop stopColor="#05080d" stopOpacity=".5" /><stop offset=".14" stopColor="#fff" stopOpacity=".1" />
        <stop offset=".31" stopColor="#000" stopOpacity=".12" /><stop offset=".49" stopColor="#fff" stopOpacity=".14" />
        <stop offset=".69" stopColor="#fff" stopOpacity=".02" /><stop offset=".89" stopColor="#000" stopOpacity=".25" /><stop offset="1" stopColor="#070b12" stopOpacity=".65" />
      </linearGradient>
      <radialGradient id={`${uid}-chest`} cx=".42" cy=".25" rx=".65" ry=".8">
        <stop stopColor="#fff" stopOpacity=".2" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#030711" stopOpacity=".34" />
      </radialGradient>
      <linearGradient id={`${uid}-sleeve`} x1="0" y1="0" x2=".1" y2="1">
        <stop stopColor="#fff" stopOpacity=".22" /><stop offset=".3" stopColor="#fff" stopOpacity=".06" /><stop offset=".65" stopColor="#000" stopOpacity=".1" /><stop offset="1" stopColor="#03060c" stopOpacity=".58" />
      </linearGradient>
      <linearGradient id={`${uid}-crease`} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#000" stopOpacity="0" /><stop offset=".35" stopColor="#000" stopOpacity=".35" /><stop offset=".55" stopColor="#fff" stopOpacity=".13" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <clipPath id={`${uid}-torso`}><path d="M87 124 Q103 130 120 124 L127 151 Q130 171 119 175 Q103 178 87 174 Q77 171 79 151 Z" /></clipPath>
      <pattern id={`${uid}-team-weave`} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform={id === 'geng' ? 'rotate(18 103 145)' : undefined}>
        <TeamWeave id={id} color={id === 't1' ? '#730f2a' : ink} />
      </pattern>
      <linearGradient id={`${uid}-art-fade`} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#fff" stopOpacity=".1" /><stop offset=".38" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" /></linearGradient>
      <mask id={`${uid}-art-mask`} maskUnits="userSpaceOnUse" x="60" y="113" width="80" height="65"><rect x="60" y="113" width="80" height="65" fill={fill('art-fade')} /></mask>
      <pattern id={`${uid}-rib`} width=".7" height="2" patternUnits="userSpaceOnUse"><path d="M.15 0v2" stroke={ink} strokeWidth=".18" strokeOpacity=".3" /><path d="M.4 0v2" stroke="#000" strokeWidth=".16" strokeOpacity=".4" /></pattern>
      <pattern id={`${uid}-knit`} width=".85" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
        <path d="M.1 .15l.2 .3-.2 .3M.5 .75l.2 .3" fill="none" stroke="#fff" strokeOpacity=".09" strokeWidth=".12" />
        <path d="M.4 0v.45" stroke="#000" strokeOpacity=".13" strokeWidth=".15" />
      </pattern>
      <pattern id={`${uid}-vent`} width="1.3" height="1.7" patternUnits="userSpaceOnUse">
        <ellipse cx=".6" cy=".8" rx=".18" ry=".32" fill="#02060a" opacity=".3" />
      </pattern>
      <filter id={`${uid}-soft`} x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation=".65" /></filter>
    </defs>
    <path d={silhouette} fill={base} stroke="#141820" strokeOpacity=".7" strokeWidth=".65" strokeLinejoin="round" />
    <g clipPath={fill('outline')}>
      {/* Broad colour blocks stay legible on the small mascot. */}
      {id === 'gam' && <>
        <path d={left} fill={trim} /><path d={right} fill={trim} />
        <path d="M82 134 L103 143 L124 134 L123 139 L103 149 L83 139 Z" fill={trim} />
        <path d="M83 143 L103 152 L123 143" fill="none" stroke={trim} strokeWidth=".75" />
        <path d="M84 151 L89 156 L88 172 L83 170 Z M122 151 L117 156 L118 172 L123 170 Z" fill={trim} />
      </>}
      {id === 'tsw' && <>
        <path d="M60 118 Q77 116 91 120 L86 126 Q74 125 62 123 Z M116 119 Q126 115 136 114 L137 120 Q128 125 122 125 Z" fill={trim} />
        <path d="M80 150 Q92 137 108 146 Q117 150 125 143 L126 151 Q115 159 104 153 Q92 146 80 158 Z" fill={trim} />
        <path d="M81 162 Q93 152 106 159 Q117 164 125 157" fill="none" stroke={ink} strokeWidth="1" />
      </>}
      {id === 'viking' && <>
        <path d={left} fill={trim} /><path d={right} fill={trim} />
        <path d="M82 145 L103 160 L124 145 L123 152 L103 167 L83 152 Z" fill={trim} />
        <path d="M84 137 L103 151 L122 137" fill="none" stroke={ink} strokeWidth=".7" />
      </>}
      {id === 't1' && <>
        {/* Signature scarlet with dark shoulders and fast, ivory flank strokes. */}
        <path d={left} fill={trim} /><path d={right} fill={trim} />
        <path d="M90 119 L96 127 L87 134 L83 128 Z M116 119 L110 127 L120 134 L123 128 Z" fill={trim} />
        <path d="M81 145 L94 136 L88 147 L81 154 Z M125 145 L112 136 L118 147 L125 154 Z" fill={ink} />
        <path d="M82 157 L91 151 L87 159 L83 162 Z M124 157 L115 151 L119 159 L123 162 Z" fill={ink} opacity=".8" />
        <path d="M65 119 L82 123 M124 122 L134 117" fill="none" stroke={base} strokeWidth="2" />
      </>}
      {id === 'geng' && <>
        <path d="M61 116 L89 118 L87 123 L62 122 Z M116 118 L135 114 L137 120 L121 123 Z" fill={trim} />
        <path d="M82 135 L90 144 L88 172 L82 170 Z M124 135 L116 144 L118 172 L124 170 Z" fill={trim} />
        <path d="M88 132 Q103 139 118 132" fill="none" stroke={trim} strokeWidth="1.2" />
        <path d="M91 136 Q103 142 115 136" fill="none" stroke={trim} strokeWidth=".45" />
      </>}
      {id === 'hle' && <>
        <path d={left} fill={base} /><path d={right} fill={base} />
        {/* Black-on-black shoulder fabric, with creases following the raised arms. */}
        <path d="M86 120 L95 128 L89 136 L83 130 Z M120 120 L111 128 L118 136 L123 129 Z" fill="#25282d" opacity=".6" />
        <path d="M67 120 L75 122 L81 130 M131 118 L127 122 L123 128" fill="none" stroke="#45484b" strokeWidth=".6" opacity=".5" />
        <path d="M87 134 Q91 149 87 169 M119 134 Q115 149 119 169" fill="none" stroke="#303237" strokeWidth=".5" />
        {/* Orange double ribs follow the actual sleeve opening, leaving a black channel. */}
        <path d="M64 119 Q63 121 65 125 M136 118 Q139 120 138 124" fill="none" stroke="#080a0d" strokeWidth="3.2" />
        <path d="M63 119 Q62 121 64 124 M137 118 Q140 120 139 123" fill="none" stroke={trim} strokeWidth=".8" />
        <path d="M65.4 119.5 Q64.5 122 66.3 125.4 M135.8 118.8 Q138 121 136.8 124.5" fill="none" stroke={trim} strokeWidth=".65" />
        <path d="M66.7 120 Q65.8 122.5 67.5 125.8 M134.7 119.3 Q136.8 121.5 135.7 125" fill="none" stroke="#f4b17d" strokeWidth=".23" strokeDasharray=".45 .45" opacity=".6" />
      </>}
      {id === 'dk' && <>
        <path d="M61 116 L90 118 L88 125 L62 123 Z M116 118 L135 114 L137 121 L121 125 Z" fill={trim} />
        <path d="M83 134 L90 141 L87 171 L81 172 Z M123 134 L116 141 L119 171 L125 172 Z" fill={trim} />
        <path d="M89 134 Q103 141 117 134" stroke={ink} strokeWidth="1" fill="none" />
        <path d="M91 158 H115 M94 161 H112" stroke={trim} strokeWidth=".6" opacity=".35" />
      </>}
      {id === 'kt' && <>
        <path d={left} fill={trim} /><path d={right} fill={trim} />
        <path d="M81 146 H125 V153 H81 Z" fill={trim} />
        <path d="M82 155 H124" stroke={ink} strokeWidth=".65" />
      </>}
      {id === 'jdg' && <>
        <path d={left} fill={trim} /><path d={right} fill={trim} />
        <path d="M81 155 L119 126 L123 135 L84 165 Z" fill={trim} />
        <path d="M84 168 L124 139" stroke={ink} strokeWidth=".8" />
      </>}
      {id === 'blg' && <>
        <path d="M62 116 L90 118 L86 125 L62 122 Z M116 118 L135 114 L137 121 L121 125 Z" fill={trim} />
        <path d="M82 137 L90 143 L87 171 L81 171 Z M124 137 L116 143 L119 171 L125 171 Z" fill={ink} />
        <path d="M87 141 L92 145 M119 141 L114 145" stroke={trim} strokeWidth="2" />
      </>}
      {id === 'tes' && <>
        <path d={left} fill={trim} /><path d={right} fill={trim} />
        <path d="M81 138 L103 146 L125 138 L125 145 L103 153 L81 145 Z" fill={trim} />
        <path d="M81 149 L103 157 L125 149" stroke={ink} strokeWidth=".6" fill="none" />
        <path d="M84 157 L90 160 L88 173 H82 Z M122 157 L116 160 L118 173 H124 Z" fill={trim} />
      </>}
      {id === 'g2' && <>
        <path d="M61 116 L90 118 L87 124 L63 122 Z M116 118 L135 114 L136 120 L121 124 Z" fill={trim} />
        <path d="M85 131 L103 144 L121 131 L122 137 L103 151 L84 137 Z" fill={trim} />
        <path d="M83 146 L89 150 L88 172 H82 Z M123 146 L117 150 L118 172 H124 Z" fill={trim} />
      </>}
      {id === 'fnc' && <>
        <path d={left} fill={trim} /><path d={right} fill={trim} />
        <path d="M81 134 L91 140 L88 173 L81 172 Z M125 134 L115 140 L118 173 L125 172 Z" fill={trim} />
        <path d="M92 132 L103 137 L114 132" stroke={trim} strokeWidth="1.4" fill="none" />
      </>}
      <g clipPath={fill('torso')}>
        <path d={silhouette} fill={fill('team-weave')} opacity={id === 't1' ? '.58' : id === 'hle' ? '.05' : '.16'} mask={fill('art-mask')} />
        {id === 'gam' && <g transform="translate(103 151)" fill="none" stroke={trim}>
          {[9, 12, 14, 19, 21].map(r=><circle key={r} r={r} strokeWidth={r===14?'.8':'.35'} opacity=".38" />)}
          {Array.from({length:24},(_,i)=><path key={i} d="M0-16l1 2-1 2-1-2ZM0-21v2" strokeWidth=".45" opacity=".5" transform={`rotate(${i*15})`} />)}
        </g>}
        {id === 't1' && <g fill={ink}>
          <path d="M83 143 L97 133 L92 141 L84 148 Z M83 150 L94 142 L90 150 L84 154 Z M123 143 L109 133 L114 141 L122 148 Z M123 150 L112 142 L116 150 L122 154 Z" opacity=".8" />
          <path d="M95 160 L105 146 L102 156 L111 149 L103 166 L105 158 Z" fill="#8e1530" opacity=".45" />
        </g>}
        {id === 'geng' && <g fill="none" stroke={trim} strokeWidth=".55" opacity=".7">
          <path d="M89 147 L98 153 L94 157 L89 154 M117 147 L108 153 L112 157 L117 154 M90 161 L99 167 M116 161 L107 167" />
          <path d="M94 145 L103 151 L112 145 M96 148 L103 153 L110 148" strokeWidth=".3" />
        </g>}
        {id === 'fnc' && <g fill={trim} opacity=".46">
          <path d="M87 161 L99 145 L94 159 L103 150 L95 169 L97 159 L91 168 Z M111 147 L117 140 L113 151 L119 146 L113 162 L115 152 L109 158 Z" />
        </g>}
        {id === 'tsw' && <path d="M83 165 Q93 155 106 162 T125 160 M83 169 Q93 159 106 166 T125 164" fill="none" stroke={ink} strokeWidth=".6" opacity=".65" />}
        {id === 'dk' && <path d="M94 149l9-5 9 5v10l-9 5-9-5Zm3 2v6l6 3 6-3v-6l-6-3Z" fill="none" stroke={trim} strokeWidth=".5" opacity=".38" />}
        {id === 'blg' && <g fill={trim} opacity=".5"><path d="M94 151h3v3h-3ZM99 156h2v2h-2ZM110 163h3v3h-3ZM106 149h2v2h-2Z" /></g>}
      </g>
      {/* Shoulder insets and double piping sit on the fabric, below the lighting pass. */}
      <path d="M65 119 Q75 122 86 120 M120 120 Q128 119 133 117" fill="none" stroke={ink} strokeWidth=".45" strokeOpacity=".55" />
      <path d="M65 120 Q75 123 85 121 M121 121 Q128 120 133 118" fill="none" stroke="#000" strokeWidth=".55" strokeOpacity=".3" />
      <path d="M84 138 Q88 149 85 166 M122 138 Q118 149 122 166" fill="none" stroke={id === 'hle' ? base : trim} strokeWidth=".6" />
      <path d="M85 139 Q89 150 86 165 M121 139 Q117 150 121 165" fill="none" stroke={ink} strokeWidth=".25" strokeDasharray=".55 .55" opacity=".65" />
      {/* Mesh underarm inserts and a soft belly volume, with no hard outline around the sleeves. */}
      <path d="M82 132 Q90 142 87 157 L86 170 L82 168 Q80 153 82 132 M123 132 Q116 145 120 158 L121 170 L125 166 Q126 150 123 132" fill="#10151b" opacity=".22" />
      <path d="M83 136 Q89 147 86 169 M122 136 Q117 149 122 169" stroke={fill('vent')} strokeWidth="4" fill="none" />
      <path d={silhouette} fill={fill('volume')} opacity=".75" />
      <path d={silhouette} fill={fill('chest')} opacity=".65" />
      <path d={`${left} ${right}`} fill={fill('sleeve')} opacity=".65" />
      <ellipse cx="103" cy="120" rx="16" ry="9" fill={fill('chin-shadow')} />
      <path d="M79 128 Q86 130 85 137 M130 127 Q120 131 122 137" fill="none" stroke="#06090d" strokeWidth="1.4" strokeOpacity=".25" filter={fill('soft')} />
      {/* Broad folds are shaded surfaces; small seams sit on top. */}
      <g filter={fill('soft')} opacity=".65">
        <path d="M84 130 Q94 136 94 153 Q89 145 84 130 M122 129 Q109 142 115 159 Q115 140 122 129 M85 152 Q98 156 106 153 Q97 161 85 152 M106 163 Q115 157 123 157 L117 164 Z" fill="#02050b" opacity=".32" />
        <path d="M85 128 Q93 134 95 145 M120 129 Q112 139 113 152 M87 151 Q97 157 105 152 M106 162 Q115 156 121 157" fill="none" stroke="#fff" strokeWidth="1.2" strokeOpacity=".16" />
        <path d="M65 123 Q74 123 83 132 M133 120 Q126 123 121 129" stroke="#000" strokeWidth="1.7" strokeOpacity=".35" fill="none" />
      </g>
      <path d="M94 132 Q98 146 95 159 L98 165 Q99 147 96 132 Z M109 139 Q106 152 110 165 L112 166 Q108 151 111 139 Z" fill={fill('crease')} opacity=".55" />
      <path d={silhouette} fill={fill('knit')} />
      <path d="M87 120 Q82 126 83 133 M119 120 Q123 125 122 131" stroke="#000" strokeWidth="1" strokeOpacity=".32" fill="none" />
      <path d="M88 120 Q83 126 84 133 M118 120 Q122 125 121 131" stroke={ink} strokeWidth=".4" strokeOpacity=".4" strokeDasharray=".6 .6" fill="none" />
      {/* Ribbed cuffs follow the angle of the exposed paws. */}
      <path d="M63 119 Q62 121 64 124 M137 118 Q140 120 139 123" stroke={trim} strokeWidth={id === 'hle' ? '.8' : '1.6'} fill="none" />
      <path d="M63 120 Q63 122 64 124 M137 119 Q139 121 138 123" stroke={ink} strokeWidth=".65" strokeDasharray=".3 .5" strokeOpacity=".6" fill="none" />
      <path d="M63 119 Q62 121 64 124 M137 118 Q140 120 139 123" stroke={fill('rib')} strokeWidth="1.7" fill="none" />
      <path d="M65 126 Q74 127 81 133 M133 123 Q128 126 124 128" fill="none" stroke="#060a10" strokeWidth=".6" strokeOpacity=".45" />
      <path d="M66 125 Q74 126 80 131 M132 122 Q128 125 124 127" fill="none" stroke={ink} strokeWidth=".35" strokeOpacity=".45" />
      <path d="M85 158 Q103 170 122 158 L119 163 Q103 172 88 163 Z" fill="#06090e" opacity=".3" />
      <path d="M87 161 Q103 170 120 161 M88 162 Q103 171 119 162" stroke={ink} strokeWidth=".3" strokeDasharray=".6 .6" strokeOpacity=".45" fill="none" />
      <g transform="translate(0 -9) rotate(-5 114 168)">
        <rect x="110.5" y="166.5" width="6.5" height="3.6" rx=".4" fill="#111820" stroke={trim} strokeWidth=".25" />
        <path d="M111.2 167.1h5.1v2.4h-5.1Z" fill="none" stroke={ink} strokeWidth=".18" strokeDasharray=".4 .35" opacity=".65" />
        <path d="M112 167.8h2.8M112 168.6h1.9" stroke={ink} strokeWidth=".25" />
        <path d="M115.5 167.5v1.5" stroke={trim} strokeWidth=".6" />
      </g>
      <path d="M83 153L86 156v4M124 153L121 156v4" fill="none" stroke={ink} strokeWidth=".3" opacity=".55" />
    </g>
    {id === 'hle' ? <g strokeLinejoin="round">
      <path d="M90 118 Q103 122 116 118 L103 128 Z" fill="#090b0e" />
      <path d="M90 118 L103 125 L116 118" fill="none" stroke="#080a0d" strokeWidth="3.8" />
      <path d="M90 118 L103 125 L116 118" fill="none" stroke={trim} strokeWidth=".85" />
      <path d="M90.5 120.4 L103 127.1 L115.5 120.4" fill="none" stroke={trim} strokeWidth=".6" />
      <path d="M90 118 L103 125 L116 118" fill="none" stroke={fill('rib')} strokeWidth=".8" />
      <path d="M91 117.8 L103 124.3 L115 117.8" fill="none" stroke="#ffc492" strokeOpacity=".55" strokeWidth=".22" />
      <path d="M91.3 121.8 L103 128 L114.7 121.8" fill="none" stroke="#626167" strokeWidth=".25" strokeDasharray=".45 .45" />
      <path d="M103 125v2.2" stroke="#7d3f26" strokeWidth=".5" />
      <path d="M87 120 Q82 126 83 133 M119 120 Q123 125 122 131" fill="none" stroke="#0a0d10" strokeWidth="1" />
      <path d="M87 120 Q83 126 84 133 M119 120 Q122 125 121 131" fill="none" stroke="#76757c" strokeOpacity=".55" strokeWidth=".22" strokeDasharray=".5 .6" />
    </g> : <g>
    {/* Neck opening is recessed; the outer rib catches the overhead light. */}
    <path d="M90 118 Q103 122 116 118 Q113 128 103 129 Q94 127 90 118" fill="#101318" />
    <path d={id === 'hle' ? 'M90 118 L103 125 L116 118' : 'M90 118 Q103 132 116 118'} stroke={collar} strokeWidth={id === 'hle' ? '.75' : '2.2'} fill="none" />
    <path d={id === 'hle' ? 'M90 118 L103 125 L116 118' : 'M90 118 Q103 132 116 118'} stroke={fill('rib')} strokeWidth={id === 'hle' ? '.55' : '2'} fill="none" />
    <path d={id === 'hle' ? 'M91 119 L103 125.5 L115 119' : 'M91 119 Q103 131 115 119'} stroke={ink} strokeWidth=".5" strokeOpacity=".6" fill="none" />

    <path d="M101 127 L103 130 L105 127" fill="none" stroke={trim} strokeWidth=".8" />
    <path d="M92 121 Q103 132 114 121" stroke="#000" strokeWidth=".6" strokeOpacity=".55" fill="none" />    </g>}

  </g>;
}
