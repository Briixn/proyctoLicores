var fs = require('fs');
var inquirer = require('inquirer');
var rxjs = require('rxjs');
var mergeMap = require('rxjs/operators').mergeMap;
var map = require('rxjs/operators').map;
var find = require('rxjs/operators').find;
var nombreBD = 'licores.json';
var tipoLicorGeneral = [
    'Vino', 'Cerveza', 'Champagne', 'Chicha', 'Aguardiente',
    'Ron', 'Vodka', 'Whisky', 'Tequila', 'Ginebra', 'Brandy'
];
var preguntaMenu = {
    type: 'list',
    name: 'opcionMenu',
    message: 'Que quieres hacer??',
    choices: [
        'Crear',
        'Borrar',
        'Buscar',
        'Actualizar',
        'Imprimir',
    ]
};
var preguntaNuevoLicor = [
    {
        type: 'input',
        name: 'nombre',
        message: 'Nombre del licor: '
    },
    {
        type: 'list',
        name: 'tipo',
        message: 'Tipo del licor: ',
        choices: tipoLicorGeneral
    },
    {
        type: 'input',
        name: 'grado',
        message: 'Grado del licor: '
    },
];
var preguntaLicorBusquedaPorNombre = [
    {
        type: 'input',
        name: 'nombre',
        message: 'Escribe el nombre del licor a buscar'
    }
];
var preguntaActualizarLicor = [
    {
        type: 'input',
        name: 'nombre',
        message: 'Escribe el nuevo nombre del licor'
    },
    {
        type: 'list',
        name: 'tipo',
        message: 'Escoge el nuevo tipo del licor',
        choices: tipoLicorGeneral
    },
    {
        type: 'input',
        name: 'grado',
        message: 'Escribe el nuevo grado del licor: '
    },
];
function main() {
    inicializarBase()
        .pipe(mergeMap(function (respuestaBDD) {
        return Menu()
            .pipe(map(function (respuesta) {
            return {
                respuestaPreguntas: respuesta,
                respuestaBDD: respuestaBDD
            };
        }));
    }), 
    //ALMACENAR NOMBRE NO ===
    mergeMap(//preuntar y devolver observable
    function (respuesta) {
        switch (respuesta.respuestaPreguntas.opcionMenu) {
            case 'Crear':
                return rxjs
                    .from(inquirer.prompt(preguntaNuevoLicor))
                    .pipe(map(function (licor) {
                    respuesta.licor = licor;
                    return respuesta;
                }));
            case 'Buscar':
                return rxjs
                    .from(inquirer.prompt(preguntaLicorBusquedaPorNombre))
                    .pipe(map(function (nombre) {
                    respuesta.licor = nombre;
                    return respuesta;
                }));
            case 'Actualizar':
                return rxjs
                    .from(inquirer.prompt(preguntaLicorBusquedaPorNombre))
                    .pipe(map(function (nombre) {
                    respuesta.licor = nombre;
                    return rxjs
                        .from(actualizarLicor(nombre, inquirer.prompt(preguntaActualizarLicor)))
                        .pipe(map(function (mensaje) {
                        respuesta.respuestaBDD = mensaje;
                        return respuesta;
                    }));
                }));
            case 'Borrar':
                return rxjs
                    .from(inquirer.prompt(preguntaLicorBusquedaPorNombre))
                    .pipe(map(function (nombre) {
                    respuesta.licor = nombre;
                    console.log('borrar licor: ' + respuesta.licor.nombre);
                    return respuesta;
                }));
            case 'Imprimir':
                console.log(respuesta.respuestaBDD.bdd.licores);
                break;
            default:
                respuesta.licor = {
                    nombre: null,
                    tipo: null,
                    grado: null
                };
                rxjs.of(respuesta);
        }
    }), map(//Actuar
    function (respuesta) {
        console.log('respuesta en accion', respuesta);
        switch (respuesta.respuestaPreguntas.opcionMenu) {
            case 'Crear':
                var nuevoLicor = respuesta.licor;
                respuesta.respuestaBDD.bdd.licores.push(nuevoLicor);
                return respuesta;
            case 'Actualizar':
                return respuesta;
            case 'Borrar':
                var contenido = JSON.stringify(respuesta.respuestaBDD.bdd);
                var bdd = JSON.parse(contenido);
                var indiceLicor = bdd.licores
                    .findIndex(function (licor) {
                    return licor.nombre === respuesta.licor.nombre;
                });
                console.log('indice' + indiceLicor);
                bdd.licores
                    .splice(indiceLicor, 1);
                respuesta.respuestaBDD.mensaje = 'Licor eliminado';
                respuesta.respuestaBDD.bdd = bdd;
                return respuesta;
            case 'Buscar':
                var base = JSON.parse(JSON.stringify(respuesta.respuestaBDD.bdd));
                var respuestaFind = base.licores
                    .find(function (licor) {
                    return licor.nombre === respuesta.licor.nombre;
                });
                if (respuestaFind) {
                    console.log('Licor encontrado de tipo: ' + respuestaFind.tipo);
                }
                else {
                    console.log(' El licor no existe');
                }
                respuesta.respuestaBDD.mensaje = 'Busqueda';
                return respuesta;
            case 'Imprimir':
                console.log(respuesta.respuestaBDD.bdd.licores);
                break;
        }
    }), // Guardar Base de Datos
    mergeMap(function (respuesta) {
        return guardarBase(respuesta.respuestaBDD.bdd);
    }))
        .subscribe(function (mensaje) {
        console.log(mensaje);
    }, function (error) {
        console.log(error);
    }, function () {
        console.log('Completado');
        main();
    });
}
function Menu() {
    return rxjs.from(inquirer.prompt(preguntaMenu));
}
//
function inicializarBase() {
    var leerBDD$ = rxjs.from(leerBDPromesa());
    return leerBDD$
        .pipe(mergeMap(function (respuestaLeerBDD) {
        if (respuestaLeerBDD.bdd) {
            return rxjs.of(respuestaLeerBDD);
        }
        else {
            // falsy / null
            return rxjs.from(crearBD());
        }
    }));
}
function leerBDPromesa() {
    // @ts-ignore
    return new Promise(function (resolve) {
        fs.readFile(nombreBD, 'utf-8', function (error, contenidoLeido) {
            if (error) {
                resolve({
                    mensaje: 'Base de datos vacia',
                    bdd: null
                });
            }
            else {
                resolve({
                    mensaje: 'Si existe la Base',
                    bdd: JSON.parse(contenidoLeido)
                });
            }
        });
    });
}
function crearBD() {
    var base = '{"licores": []}';
    // @ts-ignore
    return new Promise(function (resolve, reject) {
        fs.writeFile(nombreBD, base, function (err) {
            if (err) {
                reject({ Mensaje: 'error creando Base', error: 500 });
            }
            else {
                resolve({ Mensaje: 'Base creada', bdd: JSON.parse(base) });
            }
        });
    });
}
function guardarBase(bdd) {
    // @ts-ignore
    return new Promise(function (resolve, reject) {
        fs.writeFile(nombreBD, JSON.stringify(bdd, null, 2), function (error) {
            if (error) {
                reject({ Mensaje: 'error guardando', error: 500 });
            }
            else {
                resolve({ Mensaje: 'Base guardada' });
            }
        });
    });
}
function buscarLicorNombre(nombre) {
    // @ts-ignore
    return new Promise(function (resolve, reject) {
        fs.readFile(nombreBD, 'utf-8', function (err, contenido) {
            if (err) {
                reject({ mensaje: 'Error leyendo' });
            }
            else {
                var bdd = JSON.parse(contenido);
                var respuestaFind = bdd.licores
                    .find(function (licor) {
                    return licor.nombre === nombre;
                });
                resolve(respuestaFind);
            }
        });
    });
}
function actualizarLicor(nombre, licor) {
    // @ts-ignore
    return new Promise(function (resolve, reject) {
        fs.readFile(nombreBD, 'utf-8', function (error, contenidoLeido) {
            if (error) {
                reject('Error leyendo');
            }
            else {
                var bdd_1 = JSON.parse(contenidoLeido);
                var indiceLicor = bdd_1.licores
                    .findIndex(function (licor) {
                    return licor.nombre === nombre;
                });
                bdd_1.licores[indiceLicor] = licor;
                fs.writeFile(nombreBD, JSON.stringify(bdd_1, null, 2), function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve({
                            mensaje: 'Licor actualizado',
                            bdd: JSON.parse(bdd_1)
                        });
                    }
                });
            }
        });
    });
}
function eliminarLicor(nombre) {
    // @ts-ignore
    return new Promise(function (resolve, reject) {
        fs.readFile(nombreBD, 'utf-8', function (error, contenidoLeido) {
            if (error) {
                reject('Error leyendo');
            }
            else {
                var bdd = JSON.parse(contenidoLeido);
                var indiceLicor = bdd.licores
                    .findIndex(function (licor) {
                    return licor.nombre === nombre;
                });
                if (indiceLicor) {
                    bdd.licores
                        .splice(indiceLicor, 1);
                    resolve({
                        mensaje: 'Licor eliminada',
                        bdd: bdd
                    });
                }
                else {
                    reject();
                }
            }
        });
    });
}

main();
