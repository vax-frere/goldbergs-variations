import { memo } from "react";
import useAssetStore from "../../services/AssetManager";

const AssetManagerDebugPanel = memo(() => {
  const {
    assets,
    loading,
    initialized,
  } = useAssetStore();

  // Calculer les statistiques
  const texturesCount = Object.keys(assets.textures).length;
  const soundsCount = Object.keys(assets.sounds).length;
  const dataCount = Object.keys(assets.data).length;
  const totalAssets = texturesCount + soundsCount + dataCount;

  const getLoadingStatusColor = () => {
    if (loading.inProgress) return "#ffcc00";
    if (loading.errors.length > 0) return "#ff6b6b";
    return "#4CAF50";
  };

  const getLoadingStatusText = () => {
    if (loading.inProgress) return "Loading...";
    if (loading.errors.length > 0) return "With Errors";
    return "Complete";
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
        📦 Asset Manager Debug
      </h3>

      {/* System Status */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>System Status</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <span>Initialized:</span>
          <span
            style={{
              backgroundColor: initialized ? "#4CAF50" : "#ff6b6b",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              color: "#fff",
            }}
          >
            {initialized ? "Yes" : "No"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Status:</span>
          <span
            style={{
              backgroundColor: getLoadingStatusColor(),
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              color: "#fff",
            }}
          >
            {getLoadingStatusText()}
          </span>
        </div>
      </div>

      {/* Loading Progress */}
      {(loading.inProgress || loading.total > 0) && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Loading Progress</div>
          <div style={{ marginBottom: "4px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
              }}
            >
              <span>Progress:</span>
              <span>{loading.progress}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${loading.progress}%`,
                  height: "100%",
                  backgroundColor: loading.inProgress ? "#ffcc00" : "#4CAF50",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "#ccc",
            }}
          >
            <span>Loaded: {loading.loaded}</span>
            <span>Total: {loading.total}</span>
          </div>
        </div>
      )}

      {/* Assets Statistics */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Assets Statistics</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Total Assets:</span>
          <span style={{ color: "#4CAF50" }}>{totalAssets}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Textures:</span>
          <span style={{ color: "#00aaff" }}>{texturesCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Sounds:</span>
          <span style={{ color: "#ff9500" }}>{soundsCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Data Files:</span>
          <span style={{ color: "#9c27b0" }}>{dataCount}</span>
        </div>
      </div>

      {/* Errors */}
      {loading.errors.length > 0 && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px",
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            borderRadius: "3px",
            border: "1px solid rgba(255, 107, 107, 0.3)",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "6px", color: "#ff6b6b" }}>
            Errors ({loading.errors.length})
          </div>
          <div
            style={{
              maxHeight: "100px",
              overflowY: "auto",
              fontSize: "10px",
            }}
          >
            {loading.errors.map((error, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "4px",
                  padding: "4px",
                  backgroundColor: "rgba(255, 107, 107, 0.05)",
                  borderRadius: "2px",
                }}
              >
                <span style={{ color: "#ff6b6b", fontWeight: "bold" }}>{error.id}:</span>
                <span style={{ color: "#ccc", marginLeft: "4px" }}>
                  {error.error?.message || "Unknown error"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset Types Details */}
      <div
        style={{
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Loaded Assets</div>
        
        {/* Textures */}
        {texturesCount > 0 && (
          <div style={{ marginBottom: "6px" }}>
            <div style={{ color: "#00aaff", fontSize: "10px", marginBottom: "2px" }}>
              Textures ({texturesCount}):
            </div>
            <div style={{ fontSize: "9px", color: "#ccc", marginLeft: "8px" }}>
              {Object.keys(assets.textures).slice(0, 3).join(", ")}
              {texturesCount > 3 && ` ... +${texturesCount - 3} more`}
            </div>
          </div>
        )}

        {/* Sounds */}
        {soundsCount > 0 && (
          <div style={{ marginBottom: "6px" }}>
            <div style={{ color: "#ff9500", fontSize: "10px", marginBottom: "2px" }}>
              Sounds ({soundsCount}):
            </div>
            <div style={{ fontSize: "9px", color: "#ccc", marginLeft: "8px" }}>
              {Object.keys(assets.sounds).slice(0, 3).join(", ")}
              {soundsCount > 3 && ` ... +${soundsCount - 3} more`}
            </div>
          </div>
        )}

        {/* Data */}
        {dataCount > 0 && (
          <div>
            <div style={{ color: "#9c27b0", fontSize: "10px", marginBottom: "2px" }}>
              Data ({dataCount}):
            </div>
            <div style={{ fontSize: "9px", color: "#ccc", marginLeft: "8px" }}>
              {Object.keys(assets.data).slice(0, 3).join(", ")}
              {dataCount > 3 && ` ... +${dataCount - 3} more`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default AssetManagerDebugPanel; 