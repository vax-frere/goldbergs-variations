import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Default constants for the black hole
const DEFAULT_SIZE = 5;
const DEFAULT_PARTICLES = 300;
const DEFAULT_CORE_RADIUS = 0.05;
const DEFAULT_MAX_RADIUS = 8;
const DEFAULT_ROTATION_SPEED = 0.15;
const DEFAULT_SPIRAL_TIGHTNESS = 4;
const DEFAULT_PARTICLE_SPEED_RANGE = [0.2, 1.0];
const DEFAULT_PARTICLE_SIZE_RANGE = [0.03, 0.15];
const DEFAULT_ACCRETION_DISK_THICKNESS = 0.4;
const DEFAULT_EVENT_HORIZON_RADIUS = 0.3;
const DEFAULT_ERGOSPHERE_RADIUS = 0.6;
const DEFAULT_PARTICLE_LIFETIME_RANGE = [5, 20];

// Create a circular particle texture dynamically
const createParticleTexture = () => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Create a more realistic radial gradient
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  // Brighter center with softer falloff
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.6)");
  gradient.addColorStop(0.8, "rgba(255, 255, 255, 0.1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  // Draw circle
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Create texture
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
    const velocities = []; // Store velocity information
    const opacities = []; // Store opacity values
    const lifetimes = []; // Store lifetime values
    const spiralParams = []; // Store spiral parameters
    const diskPhases = []; // Store disk phase offsets
    const originalDistances = []; // Store original distances from center

    // Use multiple spiral arms for more realistic accretion disk
    const numSpiralArms = 2 + Math.floor(Math.random() * 3); // 2-4 spiral arms

    for (let i = 0; i < particles; i++) {
      // Choose a random spiral arm
      const spiralArm = Math.floor(Math.random() * numSpiralArms);
      const spiralArmOffset = (Math.PI * 2 * spiralArm) / numSpiralArms;

      // Initialize with a logarithmic spiral distribution
      // This creates the classic spiral galaxy / accretion disk look
      const spiralParam = 0.1 + Math.random() * 0.2; // Controls how tight individual spirals are
      const startAngle = Math.random() * Math.PI * 8 + spiralArmOffset;

      // Generate position using logarithmic spiral
      // This is r = a * e^(b*θ) in polar coordinates
      const spiralA = 0.2 + Math.random() * 0.3;
      const spiralB = 0.1 + Math.random() * spiralParam;

      // Calculate radius using logarithmic spiral equation
      let radius = getLogarithmicSpiralPoint(startAngle, spiralA, spiralB);

      // Scale radius to our desired range, with higher density toward center
      radius =
        DEFAULT_CORE_RADIUS +
        (radius * (DEFAULT_MAX_RADIUS - DEFAULT_CORE_RADIUS)) / 1.2;

      // Apply a power distribution to concentrate more particles toward center
      radius = Math.pow(radius, 1.5);

      // Random angle with spiral arm offset
      const angle = startAngle + spiralArmOffset;

      // Vertical position (disk thickness decreases toward center)
      const maxHeight =
        DEFAULT_ACCRETION_DISK_THICKNESS * (radius / DEFAULT_MAX_RADIUS);
      const height = (Math.random() * 2 - 1) * maxHeight;

      // Calculate positions on a spiral
      const x = Math.cos(angle) * radius;
      const y = height;
      const z = Math.sin(angle) * radius;

      positions.push(x, y, z);

      // Generate particle size based on radius (smaller toward center for better detail)
      let particleSize;
      if (radius < DEFAULT_EVENT_HORIZON_RADIUS) {
        // Smaller particles near event horizon
        particleSize = DEFAULT_PARTICLE_SIZE_RANGE[0];
      } else if (radius < DEFAULT_ERGOSPHERE_RADIUS) {
        // Slightly larger in ergosphere
        particleSize = DEFAULT_PARTICLE_SIZE_RANGE[0] * 1.5;
      } else {
        // Normal distribution in accretion disk
        particleSize =
          DEFAULT_PARTICLE_SIZE_RANGE[0] +
          (radius / DEFAULT_MAX_RADIUS) *
            (DEFAULT_PARTICLE_SIZE_RANGE[1] - DEFAULT_PARTICLE_SIZE_RANGE[0]);
      }

      sizes.push(particleSize);

      // Store orbital parameters for animation
      let speed;
      if (radius < DEFAULT_EVENT_HORIZON_RADIUS) {
        // Very fast near event horizon (relativistic effects)
        speed = DEFAULT_PARTICLE_SPEED_RANGE[1] * 3.0;
      } else if (radius < DEFAULT_ERGOSPHERE_RADIUS) {
        // Fast in ergosphere
        speed = DEFAULT_PARTICLE_SPEED_RANGE[1] * 2.0;
      } else {
        // Keplerian orbital velocity: v ∝ 1/sqrt(r)
        speed =
          DEFAULT_PARTICLE_SPEED_RANGE[0] +
          (DEFAULT_PARTICLE_SPEED_RANGE[1] - DEFAULT_PARTICLE_SPEED_RANGE[0]) *
            Math.sqrt(DEFAULT_MAX_RADIUS / (radius + 0.1));
      }

      // Store parameters for animation
      velocities.push(speed);
      spiralParams.push({ a: spiralA, b: spiralB });
      diskPhases.push(startAngle);
      opacities.push(0.3 + Math.random() * 0.7);
      originalDistances.push(radius);

      // Assign random lifetime for particle recycling
      const lifetime =
        DEFAULT_PARTICLE_LIFETIME_RANGE[0] +
        Math.random() *
          (DEFAULT_PARTICLE_LIFETIME_RANGE[1] -
            DEFAULT_PARTICLE_LIFETIME_RANGE[0]);
      lifetimes.push({
        total: lifetime,
        current: Math.random() * lifetime, // Start at random point in lifecycle
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

    // Store animation parameters for use in useFrame
    particleSystem.current = {
      velocities,
      spiralParams,
      diskPhases,
      lifetimes,
      originalDistances,
      opacities,
    };
  }, [particles, spiralTightness]);

  // Create material with custom shader for better spiral effect
  const particleMaterial = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: createParticleTexture() },
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vDistance;
        varying float vOpacity;
        
        void main() {
          // Calculate distance from center for visual effects
          vDistance = length(position) / ${DEFAULT_MAX_RADIUS.toFixed(1)};
          vOpacity = opacity;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Adjust size based on distance to camera with perspective effect
          gl_PointSize = size * (400.0 / -mvPosition.z);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float time;
        varying float vDistance;
        varying float vOpacity;
        
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          
          // Calculate visual effects based on distance from center
          float innerGlow = 0.0;
          float opacity = vOpacity;
          
          // Add blue shift near event horizon (relativistic effect)
          vec3 color = vec3(1.0);
          if (vDistance < 0.05) {
            // Blue shift near event horizon
            innerGlow = 1.0 - vDistance * 20.0;
            color = mix(vec3(0.5, 0.7, 1.0), vec3(1.0), vDistance * 20.0);
            opacity *= 0.8;
          } else if (vDistance < 0.1) {
            // Transition zone
            innerGlow = 0.1;
            color = mix(vec3(0.7, 0.8, 1.0), vec3(1.0), (vDistance - 0.05) * 20.0);
          }
          
          // Apply brightness based on distance from center
          float brightness = mix(1.2, 0.6, vDistance);
          
          // Apply all effects
          gl_FragColor = vec4(color * brightness, opacity) * texColor;
          
          // Add inner glow
          gl_FragColor.rgb += vec3(innerGlow * 0.5);
          
          if (gl_FragColor.a < 0.05) discard;
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

    // Animate particles
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

      // Orbital velocity increases as particles get closer to center (Keplerian motion)
      const orbitSpeed =
        velocities[i] * rotationSpeed * (0.5 + 1.5 / Math.sqrt(radius + 0.01));

      // Calculate inward spiral motion over time
      const spiralInFactor = lifeCycle * 0.7; // How much the particle has spiraled inward
      const currentRadius = radius * (1.0 - spiralInFactor);

      // Apply relativistic effects near the event horizon
      let finalRadius = currentRadius;
      let radialVelocityFactor = 1.0;

      if (currentRadius < DEFAULT_EVENT_HORIZON_RADIUS * 1.2) {
        // Particles accelerate dramatically near the event horizon
        const distanceToHorizon = Math.max(
          0.01,
          (currentRadius - DEFAULT_CORE_RADIUS) / DEFAULT_EVENT_HORIZON_RADIUS
        );
        radialVelocityFactor = 1.0 + (1.0 / distanceToHorizon - 1.0) * 0.2;
        finalRadius = Math.max(
          DEFAULT_CORE_RADIUS,
          currentRadius - delta * radialVelocityFactor * 0.5
        );
      }

      // Calculate angle for this frame
      const baseRotation = time * orbitSpeed;
      const initialAngle = diskPhases[i];
      const totalRotation = initialAngle + baseRotation * radialVelocityFactor;

      // Apply logarithmic spiral for current frame
      const { a, b } = spiralParams[i];

      // Calculate position on logarithmic spiral
      const angle = totalRotation + spiralTightness * lifeCycle;

      // Calculate height oscillation (decreases as particles approach center)
      const heightFactor = Math.pow(currentRadius / DEFAULT_MAX_RADIUS, 1.5);
      const diskHeight = DEFAULT_ACCRETION_DISK_THICKNESS * heightFactor;
      const heightOffset = Math.sin(angle * 3 + time) * diskHeight * 0.3;

      // Update position
      positions.array[i * 3] = Math.cos(angle) * finalRadius;
      positions.array[i * 3 + 1] = heightOffset;
      positions.array[i * 3 + 2] = Math.sin(angle) * finalRadius;

      // Size changes through lifecycle
      let sizeModifier = 1.0;

      // Particles get smaller as they approach the center
      if (finalRadius < DEFAULT_EVENT_HORIZON_RADIUS) {
        sizeModifier = (finalRadius / DEFAULT_EVENT_HORIZON_RADIUS) * 0.7;
      }

      sizes.array[i] =
        DEFAULT_PARTICLE_SIZE_RANGE[0] +
        sizeModifier *
          (Math.sin(lifeCycle * Math.PI) * 0.5 + 0.5) *
          (DEFAULT_PARTICLE_SIZE_RANGE[1] - DEFAULT_PARTICLE_SIZE_RANGE[0]);

      // Opacity changes through lifecycle
      opacityAttr.array[i] =
        opacities[i] *
        (lifeCycle < 0.1
          ? lifeCycle * 10 // Fade in
          : lifeCycle > 0.9
          ? (1 - lifeCycle) * 10
          : 1); // Fade out

      // Reset particle if it's reached the event horizon or completed its lifecycle
      if (
        finalRadius <= DEFAULT_CORE_RADIUS * 1.5 ||
        lifetimes[i].current >= lifetimes[i].total
      ) {
        // Reset to outer region with new parameters
        const newAngle = Math.random() * Math.PI * 2;
        const newRadius = DEFAULT_MAX_RADIUS * (0.7 + Math.random() * 0.3);

        positions.array[i * 3] = Math.cos(newAngle) * newRadius;
        positions.array[i * 3 + 1] =
          (Math.random() * 2 - 1) * DEFAULT_ACCRETION_DISK_THICKNESS * 0.5;
        positions.array[i * 3 + 2] = Math.sin(newAngle) * newRadius;

        // Reset lifecycle
        lifetimes[i].current = 0;

        // Store new original distance
        originalDistances[i] = newRadius;

        // New random parameters
        spiralParams[i] = {
          a: 0.2 + Math.random() * 0.3,
          b: 0.1 + Math.random() * 0.2,
        };
        diskPhases[i] = newAngle;

        // New random opacity
        opacities[i] = 0.3 + Math.random() * 0.7;
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
