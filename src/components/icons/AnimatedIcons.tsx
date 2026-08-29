/**
 * AnimatedIcons.tsx — Vectoris Engineering Workstation Animated Icon Library
 *
 * Built with Lucide icons and CSS / micro-animations.
 * Honors prefers-reduced-motion automatically.
 */

import React from "react";
import {
  Zap,
  Pencil,
  Trash2,
  Sparkles,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Layers,
  Search,
  Sliders,
  FileText,
  Building2,
  Compass,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Eye,
  Check,
  X,
  Plus,
  RotateCcw,
  Activity,
  ChevronRight,
  Folder,
} from "lucide-react";

interface AnimatedIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  color?: string;
}

export function AnimatedZap({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-zap ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Zap size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedPencil({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-pencil ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Pencil size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedTrash({ size = 15, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-trash ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Trash2 size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedSparkles({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-sparkles ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Sparkles size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedCheckCircle({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-check ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <CheckCircle2 size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedUpload({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-upload ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <UploadCloud size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedRefresh({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-refresh ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <RefreshCw size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedLayers({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-layers ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Layers size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedFolderPlus({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-folder ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <FolderPlus size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedFolder({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-folder ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Folder size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedShield({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-shield ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <ShieldCheck size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedSearch({ size = 15, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-search ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Search size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedCpu({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-cpu ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Cpu size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedBuilding({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-building ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Building2 size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedCompass({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-compass ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Compass size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedSliders({ size = 15, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-sliders ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Sliders size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedFileText({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-file ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <FileText size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedArrowRight({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-arrow ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <ArrowRight size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedChevronRight({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-chevron ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <ChevronRight size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedEye({ size = 15, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-eye ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Eye size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedAlertTriangle({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-alert ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <AlertTriangle size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedCheck({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-check-simple ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Check size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedX({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-x ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <X size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedPlus({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-plus ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Plus size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedRotateCcw({ size = 14, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-rotate ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <RotateCcw size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}

export function AnimatedActivity({ size = 16, className = "", ...props }: AnimatedIconProps) {
  return (
    <span className={`anim-icon-wrap anim-icon-activity ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <Activity size={size} className="anim-icon-svg" {...(props as any)} />
    </span>
  );
}
