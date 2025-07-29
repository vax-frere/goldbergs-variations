precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;
uniform float uFrameIndex;
uniform vec2 uResolution;

varying vec2 outTexCoord;

// Générateur de bruit simple
float random(vec2 st) {
    return fract(sin(dot(st.xy + uFrameIndex, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Bruit 2D
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = outTexCoord;
    vec4 color = texture2D(uMainSampler, uv);
    
    // Si le pixel est transparent, on le garde transparent
    if (color.a < 0.1) {
        gl_FragColor = color;
        return;
    }
    
    // Détection des bords en échantillonnant les pixels voisins
    float pixelSize = 1.0 / min(uResolution.x, uResolution.y);
    vec4 up = texture2D(uMainSampler, uv + vec2(0.0, pixelSize));
    vec4 down = texture2D(uMainSampler, uv + vec2(0.0, -pixelSize));
    vec4 left = texture2D(uMainSampler, uv + vec2(-pixelSize, 0.0));
    vec4 right = texture2D(uMainSampler, uv + vec2(pixelSize, 0.0));
    
    // Est-ce qu'on est sur un bord ?
    float edge = step(0.1, abs(color.a - up.a) + abs(color.a - down.a) + 
                           abs(color.a - left.a) + abs(color.a - right.a));
    
    // Si on est sur un bord, appliquer l'effet hand-drawn
    if (edge > 0.5) {
        // Générer du bruit basé sur la position et le frame
        vec2 noiseCoord = uv * 50.0; // Échelle du bruit
        float noiseValue = noise(noiseCoord) - 0.5; // Centré sur 0
        
        // Créer une légère déformation
        vec2 offset = vec2(noiseValue) * uIntensity * pixelSize * 2.0;
        vec4 distortedColor = texture2D(uMainSampler, uv + offset);
        
        // Mélanger avec la couleur originale
        gl_FragColor = mix(color, distortedColor, 0.8);
    } else {
        gl_FragColor = color;
    }
} 