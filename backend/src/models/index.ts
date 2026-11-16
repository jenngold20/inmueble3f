import { sequelize } from '../config/database.js';
import { InmuebleModel } from './Inmueble.model.js';
import { AvisoModel } from './Aviso.model.js';
import { FotoModel } from './Foto.model.js';
import { CorridaScraperModel } from './CorridaScraper.model.js';

/* ==========================================================================
   CONFIGURACIÓN DE ASOCIACIONES RELACIONALES
   ========================================================================== */

// Inmueble (1) <---> (N) Aviso
InmuebleModel.hasMany(AvisoModel, {
  foreignKey: 'inmuebleId',
  as: 'avisos',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

AvisoModel.belongsTo(InmuebleModel, {
  foreignKey: 'inmuebleId',
  as: 'inmueble',
});

// Aviso (1) <---> (N) Foto
AvisoModel.hasMany(FotoModel, {
  foreignKey: 'avisoId',
  as: 'fotos',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

FotoModel.belongsTo(AvisoModel, {
  foreignKey: 'avisoId',
  as: 'aviso',
});

export {
  sequelize,
  InmuebleModel,
  AvisoModel,
  FotoModel,
  CorridaScraperModel,
};
