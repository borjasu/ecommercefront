import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { delay } from 'rxjs';
import { ProductoService } from '../../../core/services/producto.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Audiencia, Categoria, Color, Etiqueta, Producto, Talla } from '../../../core/models/producto.model';
import { AUDIENCIAS, CATEGORIAS } from '../../../shared/constants/categorias';
import { COLORES } from '../../../shared/constants/colores';

const RETRASO_CARGA_MS = 400;

function alMenosUnaTallaValidator(control: AbstractControl): ValidationErrors | null {
  const seleccionadas = Object.values(control.value as Record<string, boolean>);
  return seleccionadas.some(seleccionada => seleccionada) ? null : { ningunaTalla: true };
}

@Component({
    selector: 'app-mis-productos',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './mis-productos.component.html'
})
export class MisProductosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  readonly categorias = CATEGORIAS;
  readonly audiencias = AUDIENCIAS;
  readonly colores = COLORES;

  readonly tallas: Talla[] = ['S', 'M', 'L', 'XL'];

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly mostrarFormulario = signal(false);
  readonly productoEditando = signal<Producto | null>(null);

  readonly productoForm = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    categoria: ['pantalon' as Categoria, [Validators.required]],
    audiencia: ['hombre' as Audiencia, [Validators.required]],
    destacado: [false],
    etiqueta: ['NINGUNA' as 'NINGUNA' | 'NUEVO' | 'ESENCIAL'],
    imagenUrl: [''],
    tallas: this.fb.group(
      { S: [false], M: [false], L: [false], XL: [false] },
      { validators: alMenosUnaTallaValidator }
    ),
    colores: this.fb.group(
      Object.fromEntries(COLORES.map(opcion => [opcion.valor, this.fb.control(false)]))
    )
  });

  constructor() {
    this.productoService
      .obtenerTodos()
      .pipe(delay(RETRASO_CARGA_MS))
      .subscribe(productos => {
        this.productos.set(productos);
        this.cargando.set(false);
      });
  }

  abrirFormularioNuevo(): void {
    this.productoEditando.set(null);
    this.productoForm.reset({
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: 'pantalon',
      audiencia: 'hombre',
      destacado: false,
      etiqueta: 'NINGUNA',
      imagenUrl: '',
      tallas: { S: false, M: false, L: false, XL: false },
      colores: this.mapaColores([])
    });
    this.mostrarFormulario.set(true);
  }

  abrirFormularioEditar(producto: Producto): void {
    this.productoEditando.set(producto);
    this.productoForm.reset({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      categoria: producto.categoria,
      audiencia: producto.audiencia,
      destacado: producto.destacado,
      etiqueta: producto.etiqueta ?? 'NINGUNA',
      imagenUrl: producto.imagenUrl,
      tallas: {
        S: producto.tallasDisponibles.includes('S'),
        M: producto.tallasDisponibles.includes('M'),
        L: producto.tallasDisponibles.includes('L'),
        XL: producto.tallasDisponibles.includes('XL')
      },
      colores: this.mapaColores(producto.coloresDisponibles)
    });
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  guardar(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    const valores = this.productoForm.getRawValue();
    const tallasDisponibles = this.tallas.filter(talla => valores.tallas[talla]);
    const coloresDisponibles = this.colores
      .map(opcion => opcion.valor)
      .filter(color => valores.colores[color]);
    const etiqueta: Etiqueta = valores.etiqueta === 'NINGUNA' ? null : valores.etiqueta;

    const datosProducto = {
      nombre: valores.nombre!,
      descripcion: valores.descripcion ?? '',
      precio: valores.precio!,
      categoria: valores.categoria as Categoria,
      audiencia: valores.audiencia as Audiencia,
      coloresDisponibles,
      destacado: !!valores.destacado,
      tallasDisponibles,
      imagenUrl: valores.imagenUrl || 'https://picsum.photos/seed/nuevo/400/500',
      etiqueta
    };

    const edicion = this.productoEditando();
    const operacion = edicion
      ? this.productoService.actualizarProducto(edicion.id, datosProducto)
      : this.productoService.crearProducto(datosProducto);

    operacion.subscribe(() => {
      this.cargarProductos();
      this.cerrarFormulario();
      this.toastService.exito(edicion ? 'Producto actualizado.' : 'Producto creado.');
    });
  }

  async eliminar(producto: Producto): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar producto',
      mensaje: `¿Seguro que quieres eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true
    });

    if (!confirmado) {
      return;
    }

    this.productoService.eliminarProducto(producto.id).subscribe(() => {
      this.cargarProductos();
      this.toastService.exito(`"${producto.nombre}" se eliminó.`);
    });
  }

  etiquetaDeCategoria(categoria: Categoria): string {
    return this.categorias.find(opcion => opcion.valor === categoria)?.etiqueta ?? categoria;
  }

  etiquetaDeAudiencia(audiencia: Audiencia): string {
    return this.audiencias.find(opcion => opcion.valor === audiencia)?.etiqueta ?? audiencia;
  }

  private mapaColores(seleccionados: Color[]): Record<string, boolean> {
    return Object.fromEntries(this.colores.map(opcion => [opcion.valor, seleccionados.includes(opcion.valor)]));
  }

  private cargarProductos(): void {
    this.productoService.obtenerTodos().subscribe(productos => this.productos.set(productos));
  }
}
