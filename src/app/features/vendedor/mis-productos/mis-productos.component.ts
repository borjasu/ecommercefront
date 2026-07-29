import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ProductoService } from '../../../core/services/producto.service';
import { Audiencia, Categoria, Etiqueta, Producto, Talla } from '../../../core/models/producto.model';
import { AUDIENCIAS, CATEGORIAS } from '../../../shared/constants/categorias';

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

  readonly categorias = CATEGORIAS;
  readonly audiencias = AUDIENCIAS;

  readonly tallas: Talla[] = ['S', 'M', 'L', 'XL'];

  readonly productos = signal<Producto[]>([]);
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
    )
  });

  constructor() {
    this.cargarProductos();
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
      tallas: { S: false, M: false, L: false, XL: false }
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
      }
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
    const etiqueta: Etiqueta = valores.etiqueta === 'NINGUNA' ? null : valores.etiqueta;

    const datosProducto = {
      nombre: valores.nombre!,
      descripcion: valores.descripcion ?? '',
      precio: valores.precio!,
      categoria: valores.categoria as Categoria,
      audiencia: valores.audiencia as Audiencia,
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
    });
  }

  eliminar(producto: Producto): void {
    if (!confirm(`¿Seguro que quieres eliminar "${producto.nombre}"?`)) {
      return;
    }

    this.productoService.eliminarProducto(producto.id).subscribe(() => this.cargarProductos());
  }

  etiquetaDeCategoria(categoria: Categoria): string {
    return this.categorias.find(opcion => opcion.valor === categoria)?.etiqueta ?? categoria;
  }

  etiquetaDeAudiencia(audiencia: Audiencia): string {
    return this.audiencias.find(opcion => opcion.valor === audiencia)?.etiqueta ?? audiencia;
  }

  private cargarProductos(): void {
    this.productoService.obtenerTodos().subscribe(productos => this.productos.set(productos));
  }
}
