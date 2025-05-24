// Exporter les composants optimisés comme composants par défaut
import Graph from "./Graph";
import OptimizedNode from "./Node/OptimizedNode";
import OptimizedLink from "./Link/OptimizedLink";
import useCollisionDetection from "./hooks/useCollisionDetection";

// Exporter les versions optimisées par défaut
export default Graph;
export { OptimizedNode as Node, OptimizedLink as Link, useCollisionDetection };
