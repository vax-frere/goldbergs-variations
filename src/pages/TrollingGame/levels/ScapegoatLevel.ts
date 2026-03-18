import { BaseLevel } from './BaseLevel';
import { LEVEL } from '../types/constants';
import type { TrollingGameScene, Vector2 } from '../types/types';

/**
 * 🐐 SCAPEGOAT - TROUVER ET ISOLER LE BOUC ÉMISSAIRE
 *
 * Mécanique : Un NPC "bouc émissaire" est caché parmi les autres.
 * Il est visuellement identique, mais son comportement est différent :
 * - Il ne fuit PAS quand le joueur crie (seul indice)
 * - Sa présence agite le groupe (tremblements, fuite spontanée)
 * - Quand il est isolé, le groupe se calme
 *
 * Victoire : Isoler le bouc émissaire du groupe pendant suffisamment longtemps
 *
 * Concept enseigné : Le mécanisme du bouc émissaire / exclusion sociale
 */
export class ScapegoatLevel extends BaseLevel {
  override disableNpcFollowing = true;

  /** Le bouc émissaire */
  protected scapegoatNpc: any = null;

  /** Nombre de NPCs proches du bouc émissaire (diagnostic) */
  protected nearbyNpcCount = 0;

  /** État d'isolation */
  protected isolationTimer = 0;
  protected isScapegoatIsolated = false;
  protected lastAgitationCheck = 0;

  /** Debug: log throttle */
  private _lastDebugLog = 0;

  override readonly levelConfig = {
    name: 'The Scapegoat',
    mechanic: 'FIND_AND_ISOLATE',
    description: 'Un NPC perturbe le groupe. Trouvez-le et isolez-le.',
    npcCount: LEVEL.SCAPEGOAT.NPC_COUNT,
    agitationRadius: LEVEL.SCAPEGOAT.AGITATION_RADIUS,
    agitationCheckInterval: LEVEL.SCAPEGOAT.AGITATION_CHECK_INTERVAL,
    agitationChance: LEVEL.SCAPEGOAT.AGITATION_CHANCE,
    isolationRadius: LEVEL.SCAPEGOAT.ISOLATION_RADIUS,
    maxNearbyNpcs: LEVEL.SCAPEGOAT.MAX_NEARBY_NPCS,
    isolationDuration: LEVEL.SCAPEGOAT.ISOLATION_DURATION,
  };

  constructor(
    scene: TrollingGameScene,
    entityManager: any,
    collisionSystem: any,
    footstepsSystem: any = null,
  ) {
    super(scene, entityManager, collisionSystem, footstepsSystem);
  }

  protected override onLevelActivated(): void {
    this.isolationTimer = 0;
    this.isScapegoatIsolated = false;
  }

  protected override onAfterSpawn(): void {
    this.setupNpcBehavior();
    this.designateScapegoat();
  }

  /** Configurer le comportement des NPCs : pas de following */
  private setupNpcBehavior(): void {
    if (!this.npcSpawner) return;
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach((npc: any) => {
      if (npc.sprite?.body) {
        npc.canFollow = false;
        npc.sprite.body.setMass(LEVEL.SCAPEGOAT.NPC_MASS);
        npc.sprite.body.setDrag(LEVEL.SCAPEGOAT.NPC_DRAG, LEVEL.SCAPEGOAT.NPC_DRAG);
        npc.sprite.body.setBounce(LEVEL.SCAPEGOAT.NPC_BOUNCE, LEVEL.SCAPEGOAT.NPC_BOUNCE);
      }
    });
  }

  /** Désigner un NPC comme bouc émissaire */
  private designateScapegoat(): void {
    if (!this.npcSpawner) return;
    const allNpcs = this.npcSpawner.getAllNpcs();
    if (allNpcs.length === 0) return;

    const minIndex = Math.floor(allNpcs.length * 0.2);
    const maxIndex = Math.floor(allNpcs.length * 0.8);
    const scapegoatIndex = minIndex + Math.floor(Math.random() * (maxIndex - minIndex));

    this.scapegoatNpc = allNpcs[scapegoatIndex];
    this.scapegoatNpc.isScapegoat = true;

    this.scapegoatNpc.onShoutHit = (_force: number, _distance: number, _maxRadius: number) => {
      // Le bouc émissaire ignore le cri du joueur
    };
    this.scapegoatNpc.canTremble = false;

    if (this.scapegoatNpc.sprite?.body) {
      this.scapegoatNpc.sprite.body.setMass(LEVEL.SCAPEGOAT.SCAPEGOAT_MASS);
      this.scapegoatNpc.sprite.body.setDrag(LEVEL.SCAPEGOAT.SCAPEGOAT_DRAG, LEVEL.SCAPEGOAT.SCAPEGOAT_DRAG);
      this.scapegoatNpc.sprite.body.setBounce(LEVEL.SCAPEGOAT.SCAPEGOAT_BOUNCE, LEVEL.SCAPEGOAT.SCAPEGOAT_BOUNCE);
    }
  }

  private getGroupCenter(): Vector2 {
    if (!this.npcSpawner) return { x: 0, y: 0 };
    const allNpcs = this.npcSpawner.getAllNpcs();
    let sumX = 0,
      sumY = 0,
      count = 0;
    allNpcs.forEach((npc: any) => {
      if (npc === this.scapegoatNpc || !npc.sprite) return;
      sumX += npc.sprite.x;
      sumY += npc.sprite.y;
      count++;
    });
    if (count === 0) return { x: this.scene.scale.width / 2, y: this.scene.scale.height / 2 };
    return { x: sumX / count, y: sumY / count };
  }

  private getScapegoatDistanceFromGroup(): number {
    if (!this.scapegoatNpc?.sprite) return 0;
    const groupCenter = this.getGroupCenter();
    const dx = this.scapegoatNpc.sprite.x - groupCenter.x;
    const dy = this.scapegoatNpc.sprite.y - groupCenter.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private countNpcsNearScapegoat(): number {
    if (!this.scapegoatNpc?.sprite || !this.npcSpawner) return 999;
    const allNpcs = this.npcSpawner.getAllNpcs();
    const radius = this.levelConfig.isolationRadius;
    const sx = this.scapegoatNpc.sprite.x;
    const sy = this.scapegoatNpc.sprite.y;
    let count = 0;
    for (const npc of allNpcs) {
      if (npc === this.scapegoatNpc || !npc.sprite) continue;
      const dx = npc.sprite.x - sx;
      const dy = npc.sprite.y - sy;
      if (dx * dx + dy * dy < radius * radius) count++;
    }
    return count;
  }

  private updateAgitation(time: number): void {
    if (!this.scapegoatNpc || !this.npcSpawner) return;
    if (time - this.lastAgitationCheck < this.levelConfig.agitationCheckInterval) return;
    this.lastAgitationCheck = time;

    const scapegoatDistance = this.getScapegoatDistanceFromGroup();
    const isNearGroup = scapegoatDistance < this.levelConfig.agitationRadius;
    if (!isNearGroup) return;

    const agitationIntensity = 1 - scapegoatDistance / this.levelConfig.agitationRadius;
    const adjustedChance = this.levelConfig.agitationChance * agitationIntensity;
    const allNpcs = this.npcSpawner.getAllNpcs();

    allNpcs.forEach((npc: any) => {
      if (npc === this.scapegoatNpc || !npc.sprite) return;
      if (npc.stateController?.getState?.() !== 'normal') return;

      const dx = npc.sprite.x - this.scapegoatNpc.sprite.x;
      const dy = npc.sprite.y - this.scapegoatNpc.sprite.y;
      const distToScapegoat = Math.sqrt(dx * dx + dy * dy);

      if (distToScapegoat < this.levelConfig.agitationRadius) {
        const proximityFactor = 1 - distToScapegoat / this.levelConfig.agitationRadius;
        const finalChance = adjustedChance * proximityFactor;

        if (Math.random() < finalChance) {
          if (Math.random() < LEVEL.SCAPEGOAT.AGITATION_TREMBLE_RATIO) {
            npc.stateController?.startTrembling?.(0);
          } else {
            const sc = npc.stateController as any;
            if (sc) {
              sc.state = 'fleeing';
              sc.stateTimer = 0;
              sc.stateDuration =
                LEVEL.SCAPEGOAT.AGITATION_FLEE_DURATION_BASE +
                Math.random() * LEVEL.SCAPEGOAT.AGITATION_FLEE_DURATION_RANDOM;
              const flDx = npc.sprite.x - this.scapegoatNpc.sprite.x;
              const flDy = npc.sprite.y - this.scapegoatNpc.sprite.y;
              const flDist = Math.sqrt(flDx * flDx + flDy * flDy);
              if (flDist > 0) {
                sc.fleeDirection = sc.fleeDirection || { x: 0, y: 0 };
                sc.fleeDirection.x = flDx / flDist;
                sc.fleeDirection.y = flDy / flDist;
              } else {
                const angle = Math.random() * Math.PI * 2;
                sc.fleeDirection = sc.fleeDirection || { x: 0, y: 0 };
                sc.fleeDirection.x = Math.cos(angle);
                sc.fleeDirection.y = Math.sin(angle);
              }
            }
          }
        }
      }
    });
  }

  private updateIsolationCheck(delta: number): void {
    if (!this.scapegoatNpc?.sprite) return;
    this.nearbyNpcCount = this.countNpcsNearScapegoat();
    this.isScapegoatIsolated = this.nearbyNpcCount <= this.levelConfig.maxNearbyNpcs;

    if (this.isScapegoatIsolated) {
      this.isolationTimer += delta;
    } else {
      this.isolationTimer = 0;
    }
  }

  override checkLevelCompletion(): boolean {
    return this.isScapegoatIsolated && this.isolationTimer >= this.levelConfig.isolationDuration;
  }

  protected override updateLevel(time: number, delta: number): void {
    this.updateAgitation(time);
    this.updateIsolationCheck(delta);
  }

  protected override resizeLevel(width: number, height: number): void {
    if (this.npcSpawner && this.player) {
      this.setupNpcBehavior();
      this.designateScapegoat();
    }
  }

  protected override cleanupLevel(): void {
    this.scapegoatNpc = null;
    this.nearbyNpcCount = 0;
    this.isolationTimer = 0;
    this.isScapegoatIsolated = false;
  }

  override getLevelStats(): Record<string, any> {
    return {
      name: this.levelConfig.name,
      type: 'SCAPEGOAT',
      mechanic: this.levelConfig.mechanic,
      description: this.levelConfig.description,
      npcCount: this.levelConfig.npcCount,
      scapegoatIsolated: this.isScapegoatIsolated,
      nearbyNpcCount: this.nearbyNpcCount,
      isolationRadius: this.levelConfig.isolationRadius,
      isolationProgress:
        Math.min(100, (this.isolationTimer / this.levelConfig.isolationDuration) * 100).toFixed(1) + '%',
      isolationRequired: (this.levelConfig.isolationDuration / 1000).toFixed(1) + 's',
    };
  }
}
