import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CatalogoComponent } from './catalogo.component';

describe('CatalogoComponent', () => {
  let component: CatalogoComponent;
  let fixture: ComponentFixture<CatalogoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    // CatalogoComponent inyecta ActivatedRoute (lee audiencia/categoria/término
    // de búsqueda de la URL) y ProductoService/ColoresService, que ahora hacen
    // peticiones HTTP reales — nada de esto estaba mockeado antes.
    await TestBed.configureTestingModule({
      imports: [CatalogoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({}))
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatalogoComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Sin audiencia/categoria/búsqueda en la ruta simulada, el componente pide
    // el catálogo completo (ProductoService.obtenerTodos) — se responde para
    // no dejar la petición pendiente y poder verificar que no queden otras sin manejar.
    httpMock.match(() => true).forEach(req => req.flush([]));
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
