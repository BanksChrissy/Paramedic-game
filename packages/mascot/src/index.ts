/**
 * Placeholder for mascot pack definitions and utilities.  Visual character
 * assets will be provided in a separate file structure and loaded at
 * runtime by the UI.  There is no implementation here yet.
 */

export interface MascotPose {
  id: string;
  path: string;
}

export interface MascotManifest {
  id: string;
  name: string;
  poses: MascotPose[];
}