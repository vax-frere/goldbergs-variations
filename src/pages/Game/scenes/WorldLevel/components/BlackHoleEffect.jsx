import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Default constants for the black hole
const DEFAULT_SIZE = 5;
const DEFAULT_PARTICLES = 3000;
const DEFAULT_CORE_RADIUS = 0.05;
const DEFAULT_MAX_RADIUS = 12;
const DEFAULT_ROTATION_SPEED = 0.5;
const DEFAULT_SPIRAL_TIGHTNESS = 6;
const DEFAULT_PARTICLE_SPEED_RANGE = [0.3, 1.8];
const DEFAULT_PARTICLE_SIZE_RANGE = [0.05, 0.4];
const DEFAULT_ACCRETION_DISK_THICKNESS = 4.0;
const DEFAULT_EVENT_HORIZON_RADIUS = 0.8;
const DEFAULT_ERGOSPHERE_RADIUS = 1.4;
const DEFAULT_PARTICLE_LIFETIME_RANGE = [2, 10];
const DEFAULT_VERTICAL_OSCILLATION = 0.4;
const DEFAULT_SPIRAL_ARMS = 6;
const DEFAULT_VORTEX_PULL = 2.0;
const DEFAULT_FUNNEL_FACTOR = 0.7;
const DEFAULT_BLACK_HOLE_FADE = 1.2;

// Create a circular particle texture dynamically
const createParticleTexture = () => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Create a simple radial gradient
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  // Simplified color palette
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.1, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.3, "rgba(10, 0, 20, 0.95)");
  gradient.addColorStop(0.5, "rgba(0, 150, 255, 0.85)");
  gradient.addColorStop(0.7, "rgba(100, 0, 255, 0.75)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * Component that creates a black hole effect with particles in a spiral
 *
 * @param {Object} props
 * @param {[number, number, number]} props.position - Position where the spiral should appear
 * @param {number} [props.size=5] - Size of the spiral
 * @param {number} [props.particles=3000] - Number of particles
 * @param {number} [props.rotationSpeed=0.15] - Base rotation speed
 * @param {number} [props.spiralTightness=4] - How tight the spiral is
 * @param {[number, number, number]} [props.rotation=[0,0,0]] - Rotation of the spiral in [x,y,z] format
 */
export function BlackHoleEffect({
  position = [0, 0, 0],
  size = DEFAULT_SIZE,
  particles = DEFAULT_PARTICLES,
  rotationSpeed = DEFAULT_ROTATION_SPEED,
  spiralTightness = DEFAULT_SPIRAL_TIGHTNESS,
  rotation = [0, 0, 0],
}) {
  const particlesRef = useRef();
  const particleSystem = useRef();

  // Function to generate a logarithmic spiral point
  const getLogarithmicSpiralPoint = (angle, a, b) => {
    // r = a * e^(b*θ)
    const radius = a * Math.exp(b * angle);
    return radius;
  };

  // Initialize particle positions and other parameters
  useEffect(() => {
    if (!particlesRef.current) return;

    const geometry = particlesRef.current.geometry;
    const positions = [];
    const sizes = [];
    const velocities = [];
    const opacities = [];
    const lifetimes = [];
    const spiralParams = [];
    const diskPhases = [];
    const originalDistances = [];
    const verticalOffsets = [];
    const initialHeights = [];

    for (let i = 0; i < particles; i++) {
      const spiralArm = Math.floor(Math.random() * DEFAULT_SPIRAL_ARMS);
      const spiralArmOffset = (Math.PI * 2 * spiralArm) / DEFAULT_SPIRAL_ARMS;

      // Enhanced vortex distribution
      const spiralParam = 0.2 + Math.random() * 0.3;
      const startAngle = Math.random() * Math.PI * 15 + spiralArmOffset; // More wraps

      const spiralA = 0.3 + Math.random() * 0.4;
      const spiralB = 0.15 + Math.random() * spiralParam;

      let radius = getLogarithmicSpiralPoint(startAngle, spiralA, spiralB);

      // Enhanced radius distribution for funnel effect
      radius =
        DEFAULT_CORE_RADIUS +
        (radius * (DEFAULT_MAX_RADIUS - DEFAULT_CORE_RADIUS)) / 1.1;
      radius = Math.pow(radius, 1.2);

      const angle = startAngle + spiralArmOffset;

      // Enhanced height distribution for funnel shape
      const heightRatio = radius / DEFAULT_MAX_RADIUS;
      const maxHeight =
        DEFAULT_ACCRETION_DISK_THICKNESS *
        Math.pow(heightRatio, DEFAULT_FUNNEL_FACTOR);
      const heightDistribution = Math.pow(Math.random(), 1.3) * 2 - 1;
      const height = heightDistribution * maxHeight;

      // Calculate positions with funnel effect
      const x = Math.cos(angle) * radius;
      const y = height * (1 - Math.pow(heightRatio, 0.5)); // Funnel shape
      const z = Math.sin(angle) * radius;

      positions.push(x, y, z);
      verticalOffsets.push(height);
      initialHeights.push(y); // Store initial height for animation

      // Enhanced particle size distribution
      let particleSize;
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < DEFAULT_EVENT_HORIZON_RADIUS) {
        particleSize =
          DEFAULT_PARTICLE_SIZE_RANGE[0] * (0.6 + Math.random() * 0.4);
      } else if (distanceFromCenter < DEFAULT_ERGOSPHERE_RADIUS) {
        particleSize =
          DEFAULT_PARTICLE_SIZE_RANGE[0] * (1.0 + Math.random() * 0.8);
      } else {
        particleSize =
          DEFAULT_PARTICLE_SIZE_RANGE[0] +
          heightRatio *
            (DEFAULT_PARTICLE_SIZE_RANGE[1] - DEFAULT_PARTICLE_SIZE_RANGE[0]) *
            (0.7 + Math.random() * 0.3);
      }

      sizes.push(particleSize);

      // Enhanced speed distribution for vortex effect
      let speed;
      if (distanceFromCenter < DEFAULT_EVENT_HORIZON_RADIUS) {
        speed = DEFAULT_PARTICLE_SPEED_RANGE[1] * (3.5 + Math.random() * 1.5);
      } else if (distanceFromCenter < DEFAULT_ERGOSPHERE_RADIUS) {
        speed = DEFAULT_PARTICLE_SPEED_RANGE[1] * (2.5 + Math.random() * 1.0);
      } else {
        speed =
          DEFAULT_PARTICLE_SPEED_RANGE[0] +
          (DEFAULT_PARTICLE_SPEED_RANGE[1] - DEFAULT_PARTICLE_SPEED_RANGE[0]) *
            Math.pow(DEFAULT_MAX_RADIUS / (distanceFromCenter + 0.1), 0.8);
      }

      velocities.push(speed);
      spiralParams.push({ a: spiralA, b: spiralB });
      diskPhases.push(startAngle);
      opacities.push(0.5 + Math.random() * 0.5);
      originalDistances.push(radius);

      const lifetime =
        DEFAULT_PARTICLE_LIFETIME_RANGE[0] +
        Math.random() *
          (DEFAULT_PARTICLE_LIFETIME_RANGE[1] -
            DEFAULT_PARTICLE_LIFETIME_RANGE[0]);
      lifetimes.push({
        total: lifetime,
        current: Math.random() * lifetime,
      });
    }

    // Update the geometry with positions and other attributes
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute(
      "opacity",
      new THREE.Float32BufferAttribute(opacities, 1)
    );

    // Store animation parameters
    particleSystem.current = {
      velocities,
      spiralParams,
      diskPhases,
      lifetimes,
      originalDistances,
      opacities,
      verticalOffsets,
      initialHeights,
    };
  }, [particles, spiralTightness]);

  // Enhanced shader material with simplified effects
  const particleMaterial = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: createParticleTexture() },
        time: { value: 0 },
        maxRadius: { value: DEFAULT_MAX_RADIUS },
        eventHorizonRadius: { value: DEFAULT_EVENT_HORIZON_RADIUS },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vDistance;
        varying float vOpacity;
        varying vec3 vPosition;
        
        void main() {
          vPosition = position;
          vDistance = length(position) / ${DEFAULT_MAX_RADIUS.toFixed(1)};
          vOpacity = opacity;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Simple size calculation
          gl_PointSize = size * (400.0 / -mvPosition.z);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float time;
        uniform float maxRadius;
        uniform float eventHorizonRadius;
        varying float vDistance;
        varying float vOpacity;
        varying vec3 vPosition;
        
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          
          float distanceFromCenter = length(vPosition);
          float normalizedDist = distanceFromCenter / maxRadius;
          
          // Simple color calculation
          vec3 color = vec3(1.0);
          float opacity = vOpacity;
          
          if (distanceFromCenter < eventHorizonRadius) {
            // Black hole center
            float horizonFactor = smoothstep(0.0, eventHorizonRadius, distanceFromCenter);
            color = vec3(0.0); // Pure black
            opacity *= pow(horizonFactor, 2.0);
          } else {
            // Normal colors
            color = mix(
              vec3(0.0, 0.6, 1.0), // Blue
              vec3(0.4, 0.0, 0.8), // Purple
              smoothstep(eventHorizonRadius, maxRadius, distanceFromCenter)
            );
          }
          
          // Simple brightness calculation
          float brightness = mix(1.2, 0.6, normalizedDist);
          
          gl_FragColor = vec4(color * brightness, opacity) * texColor;
          
          // Simple center darkness
          if (distanceFromCenter < eventHorizonRadius * 0.7) {
            float centerDarkness = smoothstep(0.0, eventHorizonRadius * 0.7, distanceFromCenter);
            gl_FragColor.a *= pow(centerDarkness, 2.0);
          }
          
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: false,
    })
  );

  // Animation loop
  useFrame((_, delta) => {
    if (!particlesRef.current || !particleSystem.current) return;

    // Update shader time uniform
    particleMaterial.current.uniforms.time.value += delta;

    const positions = particlesRef.current.geometry.attributes.position;
    const sizes = particlesRef.current.geometry.attributes.size;
    const opacityAttr = particlesRef.current.geometry.attributes.opacity;

    const {
      velocities,
      spiralParams,
      diskPhases,
      lifetimes,
      originalDistances,
      opacities,
      verticalOffsets,
      initialHeights,
    } = particleSystem.current;

    const time = performance.now() * 0.001;

    // Apply animation to each particle
    for (let i = 0; i < particles; i++) {
      // Update lifetime
      lifetimes[i].current += delta;

      // Calculate lifecycle phase (0 to 1)
      const lifeCycle =
        (lifetimes[i].current % lifetimes[i].total) / lifetimes[i].total;

      // Get original distance from center
      let radius = originalDistances[i];

      // Enhanced vortex motion
      const baseOrbitSpeed = velocities[i] * rotationSpeed;
      const radiusFactor = Math.pow(DEFAULT_MAX_RADIUS / (radius + 0.1), 0.7);
      const orbitSpeed = baseOrbitSpeed * (0.8 + 1.2 * radiusFactor);

      // Enhanced spiral motion for vortex effect
      const spiralInFactor = Math.pow(lifeCycle, 1.4) * DEFAULT_VORTEX_PULL;
      const currentRadius = radius * (1.0 - spiralInFactor);

      // Enhanced relativistic and vortex effects
      let finalRadius = currentRadius;
      let radialVelocityFactor = 1.0;
      let verticalOscillation = 0.0;
      let heightFactor = Math.pow(
        currentRadius / DEFAULT_MAX_RADIUS,
        DEFAULT_FUNNEL_FACTOR
      );

      if (currentRadius < DEFAULT_EVENT_HORIZON_RADIUS * 2.0) {
        const distanceToHorizon = Math.max(
          0.01,
          (currentRadius - DEFAULT_CORE_RADIUS) / DEFAULT_EVENT_HORIZON_RADIUS
        );

        // Enhanced vortex pull near horizon
        radialVelocityFactor =
          1.0 + (1.0 / Math.pow(distanceToHorizon, 0.5)) * DEFAULT_VORTEX_PULL;

        // Enhanced stretching effect
        const stretchFactor = 1.0 + (1.0 / distanceToHorizon - 1.0) * 0.4;
        finalRadius = Math.max(
          DEFAULT_CORE_RADIUS,
          currentRadius - delta * radialVelocityFactor * stretchFactor
        );

        // Enhanced vertical motion near horizon
        verticalOscillation =
          Math.sin(time * 6.0 + finalRadius * 12.0) *
          DEFAULT_VERTICAL_OSCILLATION *
          (1.0 - distanceToHorizon) *
          0.3;

        // Additional downward pull near horizon
        heightFactor *= 1.0 - Math.pow(1.0 - distanceToHorizon, 2.0);
      }

      // Calculate enhanced vortex rotation
      const baseRotation = time * orbitSpeed;
      const initialAngle = diskPhases[i];
      const totalRotation = initialAngle + baseRotation * radialVelocityFactor;

      // Apply enhanced spiral movement
      const angle = totalRotation + spiralTightness * Math.pow(lifeCycle, 1.3);

      // Calculate enhanced vortex height
      const baseHeight = verticalOffsets[i];
      const dynamicHeight = baseHeight * heightFactor + verticalOscillation;
      const vortexPull = Math.pow(1 - lifeCycle, 2.0) * DEFAULT_VORTEX_PULL;

      // Update position with vortex effect
      positions.array[i * 3] = Math.cos(angle) * finalRadius;
      positions.array[i * 3 + 1] = dynamicHeight * (1 - vortexPull);
      positions.array[i * 3 + 2] = Math.sin(angle) * finalRadius;

      // Enhanced size animation
      let sizeModifier = 1.0;
      if (finalRadius < DEFAULT_EVENT_HORIZON_RADIUS) {
        // Dramatic size changes near horizon
        const horizonDist = finalRadius / DEFAULT_EVENT_HORIZON_RADIUS;
        sizeModifier =
          horizonDist * 0.5 + Math.sin(time * 10.0 + finalRadius * 20.0) * 0.2;
      }

      // Apply size modification with smooth transition
      sizes.array[i] =
        DEFAULT_PARTICLE_SIZE_RANGE[0] +
        sizeModifier *
          (Math.sin(lifeCycle * Math.PI) * 0.5 + 0.5) *
          (DEFAULT_PARTICLE_SIZE_RANGE[1] - DEFAULT_PARTICLE_SIZE_RANGE[0]);

      // Enhanced opacity animation
      const baseOpacity = opacities[i];
      let finalOpacity = baseOpacity;

      if (finalRadius < DEFAULT_EVENT_HORIZON_RADIUS) {
        // Dramatic opacity changes near horizon
        const pulseEffect =
          Math.sin(time * 8.0 + finalRadius * 15.0) * 0.3 + 0.7;
        finalOpacity *= pulseEffect;
      }

      // Lifecycle opacity
      finalOpacity *=
        lifeCycle < 0.1
          ? lifeCycle * 10 // Fade in
          : lifeCycle > 0.9
          ? (1 - lifeCycle) * 10 // Fade out
          : 1;

      opacityAttr.array[i] = finalOpacity;

      // Enhanced particle reset logic
      if (
        finalRadius <= DEFAULT_CORE_RADIUS * 1.2 ||
        lifetimes[i].current >= lifetimes[i].total
      ) {
        // Reset to outer region with enhanced distribution
        const newAngle = Math.random() * Math.PI * 2;
        const newRadius = DEFAULT_MAX_RADIUS * (0.8 + Math.random() * 0.2);
        const newHeight =
          (Math.pow(Math.random(), 1.5) * 2 - 1) *
          DEFAULT_ACCRETION_DISK_THICKNESS *
          Math.pow(newRadius / DEFAULT_MAX_RADIUS, 0.7);

        positions.array[i * 3] = Math.cos(newAngle) * newRadius;
        positions.array[i * 3 + 1] = newHeight;
        positions.array[i * 3 + 2] = Math.sin(newAngle) * newRadius;

        // Reset lifecycle
        lifetimes[i].current = 0;
        originalDistances[i] = newRadius;
        verticalOffsets[i] = newHeight;

        // New enhanced parameters
        spiralParams[i] = {
          a: 0.2 + Math.random() * 0.4,
          b: 0.15 + Math.random() * 0.25,
        };
        diskPhases[i] = newAngle;
        opacities[i] = 0.4 + Math.random() * 0.6;
        opacityAttr.array[i] = 0; // Start invisible
      }
    }

    // Update all attributes
    positions.needsUpdate = true;
    sizes.needsUpdate = true;
    opacityAttr.needsUpdate = true;
  });

  return (
    <group
      position={[position[0], position[1], position[2]]}
      rotation={[rotation[0], rotation[1], rotation[2]]}
      scale={size}
    >
      {/* Particles */}
      <points ref={particlesRef} material={particleMaterial.current}>
        <bufferGeometry />
      </points>
    </group>
  );
}

export default BlackHoleEffect;
