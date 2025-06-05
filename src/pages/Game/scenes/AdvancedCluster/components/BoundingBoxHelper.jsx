import React, { memo, useMemo } from "react";
import * as THREE from "three";

const BOUNDING_BOX_MARGIN = 500; // Marge autour de la bounding box
const WARNING_DISTANCE = 300; // Distance à laquelle afficher l'avertissement

/**
 * Helper component to visualize cluster bounding boxes
 */
const BoundingBoxHelper = memo(({ nodes, showHelper = true }) => {
  const boundingBoxData = useMemo(() => {
    if (!nodes || nodes.length === 0) return null;

    // Calculate cluster bounds
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    nodes.forEach((node) => {
      const x = node.x || 0;
      const y = node.y || 0;
      const z = node.z || 0;

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });

    // Warning zone bounds
    const warningBounds = {
      minX: minX - (BOUNDING_BOX_MARGIN - WARNING_DISTANCE),
      maxX: maxX + (BOUNDING_BOX_MARGIN - WARNING_DISTANCE),
      minY: minY - (BOUNDING_BOX_MARGIN - WARNING_DISTANCE),
      maxY: maxY + (BOUNDING_BOX_MARGIN - WARNING_DISTANCE),
      minZ: minZ - (BOUNDING_BOX_MARGIN - WARNING_DISTANCE),
      maxZ: maxZ + (BOUNDING_BOX_MARGIN - WARNING_DISTANCE),
    };

    // Exit zone bounds
    const exitBounds = {
      minX: minX - BOUNDING_BOX_MARGIN,
      maxX: maxX + BOUNDING_BOX_MARGIN,
      minY: minY - BOUNDING_BOX_MARGIN,
      maxY: maxY + BOUNDING_BOX_MARGIN,
      minZ: minZ - BOUNDING_BOX_MARGIN,
      maxZ: maxZ + BOUNDING_BOX_MARGIN,
    };

    return { warningBounds, exitBounds };
  }, [nodes]);

  const createWireframeBox = (bounds, color) => {
    const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    return (
      <group position={[centerX, centerY, centerZ]}>
        <mesh>
          <boxGeometry args={[width, height, depth]} />
          <meshBasicMaterial
            color={color}
            wireframe={true}
            transparent={true}
            opacity={0.6}
          />
        </mesh>
      </group>
    );
  };

  if (!showHelper || !boundingBoxData) return null;

  return (
    <group>
      {/* Warning zone (orange) */}
      {createWireframeBox(boundingBoxData.warningBounds, 0xff8800)}

      {/* Exit zone (red) */}
      {createWireframeBox(boundingBoxData.exitBounds, 0xff0000)}

      {/* Legend helper spheres */}
      <group
        position={[
          boundingBoxData.warningBounds.maxX + 50,
          boundingBoxData.warningBounds.maxY,
          boundingBoxData.warningBounds.maxZ,
        ]}
      >
        <mesh position={[0, 50, 0]}>
          <sphereGeometry args={[10, 8, 6]} />
          <meshBasicMaterial color={0xff8800} />
        </mesh>
        <mesh position={[0, -50, 0]}>
          <sphereGeometry args={[10, 8, 6]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      </group>
    </group>
  );
});

BoundingBoxHelper.displayName = "BoundingBoxHelper";

export default BoundingBoxHelper;
