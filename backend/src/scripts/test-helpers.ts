/**
 * Utilidades compartidas para suites de prueba y scripts de verificación de la plataforma.
 * Estandariza aserciones, estrechamiento de tipos TypeScript y reportes en consola.
 */

export interface AssertOptions {
  silent?: boolean;
  details?: string;
}

/**
 * Aserta que una condición sea verdadera. Lanza un Error si es falsa.
 * Utiliza 'asserts condicion' para habilitar type narrowing en TypeScript.
 */
export function verificar(
  condicion: boolean,
  mensaje: string,
  opciones?: AssertOptions | string | boolean
): asserts condicion {
  const silent =
    typeof opciones === 'boolean'
      ? opciones
      : typeof opciones === 'object'
        ? opciones?.silent
        : false;
  const details =
    typeof opciones === 'string'
      ? opciones
      : typeof opciones === 'object'
        ? opciones?.details
        : undefined;

  if (!condicion) {
    const errorMsg = `Falló la aserción: ${mensaje}${details ? ` - ${details}` : ''}`;
    console.error(`❌ [FAIL] ${mensaje}`);
    if (details) {
      console.error(`   └─ ${details}`);
    }
    throw new Error(errorMsg);
  }

  if (!silent) {
    console.log(`✅ [PASS] ${mensaje}`);
    if (details) {
      console.log(`   └─ ${details}`);
    }
  }
}

/**
 * Alias estándar de verificar() con firma explícita para estrechamiento de tipos.
 */
export function assert(
  condicion: boolean,
  mensaje: string,
  opciones?: AssertOptions | string | boolean
): asserts condicion {
  verificar(condicion, mensaje, opciones);
}

/**
 * Acumulador de pruebas para suites que no deben abortar en el primer fallo.
 * Ideal para suites exploratorias como deduplicación y servicios geoespaciales.
 */
export class TestRunner {
  private total = 0;
  private passed = 0;

  constructor(public readonly nombre: string) {}

  assert(condicion: boolean, testName: string, details?: string): boolean {
    this.total++;
    if (condicion) {
      this.passed++;
      console.log(`  ✅ [PASS] ${testName}`);
      if (details) console.log(`     └─ ${details}`);
      return true;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     └─ ${details}`);
      process.exitCode = 1;
      return false;
    }
  }

  get stats() {
    return {
      total: this.total,
      passed: this.passed,
      fallados: this.total - this.passed,
      exitoso: this.passed === this.total && this.total > 0,
    };
  }

  imprimirResumen(): void {
    console.log('\n========================================================');
    console.log(`🎉 RESUMEN [${this.nombre}]:`);
    console.log(`   - Tests ejecutados: ${this.total}`);
    console.log(`   - Tests exitosos:   ${this.passed}/${this.total}`);
    console.log('========================================================\n');
    if (this.passed !== this.total) {
      process.exit(1);
    }
  }
}
