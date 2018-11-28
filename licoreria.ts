const fs = require('fs');
const inquirer = require('inquirer');
const rxjs = require('rxjs');
const mergeMap = require('rxjs/operators').mergeMap;
const map = require('rxjs/operators').map;
const find = require('rxjs/operators').find;
const nombreBD= 'licores.json';
const tipoLicorGeneral = [
    'Vino','Cerveza','Champagne','Chicha','Aguardiente',
    'Ron','Vodka','Whisky','Tequila','Ginebra','Brandy'

];
const preguntaMenu = {
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


const preguntaNuevoLicor = [
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

const preguntaLicorBusquedaPorNombre = [
    {
        type: 'input',
        name: 'nombre',
        message: 'Escribe el nombre del licor a buscar'
    }
];


const preguntaActualizarLicor = [
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

function main(){
    inicializarBase()
        .pipe(
            mergeMap(
                (respuestaBDD: RespuestaBDD)=> {
                    return Menu()
                        .pipe(
                            map(
                                (respuesta: OpcionesPregunta) => {
                                    return {
                                        respuestaPreguntas: respuesta,
                                        respuestaBDD
                                    }
                                }
                            )
                        )
                }
            ),
            //ALMACENAR NOMBRE NO ===
            mergeMap( //preuntar y devolver observable
                (respuesta: RespuestaPreguntas) => {
                    switch (respuesta.respuestaPreguntas.opcionMenu) {
                        case 'Crear':
                            return rxjs
                                .from(inquirer.prompt(preguntaNuevoLicor))
                                .pipe(
                                    map(
                                        (licor:Licor) => {
                                            respuesta.licor = licor;
                                            return respuesta
                                        }
                                    )
                                );
                        case 'Buscar':
                            return rxjs
                                .from(inquirer.prompt(preguntaLicorBusquedaPorNombre))
                                .pipe(
                                    map(
                                        (nombre) => {
                                            respuesta.licor= nombre;
                                            return respuesta
                                        }
                                    )
                                );
                        case 'Actualizar':
                            return rxjs
                                .from(inquirer.prompt(preguntaLicorBusquedaPorNombre))
                                .pipe(
                                    map(
                                        nombre => {
                                            respuesta.licor = nombre;
                                            return rxjs
                                                .from(actualizarLicor(nombre,inquirer.prompt(preguntaActualizarLicor)))
                                                .pipe(
                                                    map(
                                                        (mensaje)=> {
                                                            respuesta.respuestaBDD = mensaje;
                                                            return respuesta
                                                        }
                                                    )
                                                )
                                        }
                                    )
                                );
                        case 'Borrar':
                            return rxjs
                                .from(inquirer.prompt(preguntaLicorBusquedaPorNombre))
                                .pipe(
                                    map(
                                        (nombre) => {
                                            respuesta.licor= nombre;
                                            console.log('borrar licor: '+respuesta.licor.nombre);
                                            return respuesta
                                        }
                                    )
                                );
                        case 'Imprimir':
                            console.log(respuesta.respuestaBDD.bdd.licores);
                            break;
                        default:
                            respuesta.licor = {
                                nombre: null,
                                tipo: null,
                                grado: null
                            };
                            rxjs.of(respuesta)

                    }
                }
            ),
            map(//Actuar
                (respuesta: RespuestaPreguntas) => {
                    console.log('respuesta en accion', respuesta);
                    switch (respuesta.respuestaPreguntas.opcionMenu) {
                        case 'Crear':
                            const nuevoLicor = respuesta.licor;
                            respuesta.respuestaBDD.bdd.licores.push(nuevoLicor);
                            return respuesta;

                        case 'Actualizar':
                            return respuesta;

                        case 'Borrar':
                            const contenido = JSON.stringify(respuesta.respuestaBDD.bdd);
                            const bdd = JSON.parse(contenido);
                            const indiceLicor = bdd.licores
                                .findIndex(
                                    (licor) => {

                                        return licor.nombre === respuesta.licor.nombre;
                                    }
                                );
                            console.log('indice' +indiceLicor);
                            bdd.licores
                                .splice(indiceLicor, 1);
                            respuesta.respuestaBDD.mensaje= 'Licor eliminado';
                            respuesta.respuestaBDD.bdd= bdd;


                            return respuesta;

                        case 'Buscar':
                            const base = JSON.parse(JSON.stringify(respuesta.respuestaBDD.bdd));
                            const respuestaFind = base.licores
                                .find(
                                    (licor: Licor) => {
                                        return licor.nombre === respuesta.licor.nombre;
                                    }
                                );

                            if (respuestaFind){
                                console.log('Licor encontrado de tipo: '+respuestaFind.tipo);
                            }else {
                                console.log(' El licor no existe')
                            }
                            respuesta.respuestaBDD.mensaje= 'Busqueda';

                            return respuesta;

                        case 'Imprimir':
                            console.log(respuesta.respuestaBDD.bdd.licores);
                            break


                    }
                }

            ), // Guardar Base de Datos
            mergeMap(
                (respuesta: RespuestaPreguntas) => {
                    return guardarBase(respuesta.respuestaBDD.bdd);
                }
            )
        )
        .subscribe(
            (mensaje) => {
                console.log(mensaje);
            },
            (error) => {
                console.log(error);
            }, () => {
                console.log('Completado');
                main();
            }
        )
}
function Menu(){
    return rxjs.from(inquirer.prompt(preguntaMenu))
}


//

function inicializarBase() {
    const leerBDD$ = rxjs.from(leerBDPromesa());

    return leerBDD$
        .pipe(
            mergeMap(
                (respuestaLeerBDD: RespuestaBDD) => {
                    if (respuestaLeerBDD.bdd) {
                        return rxjs.of(respuestaLeerBDD)
                    } else {
                        // falsy / null
                        return rxjs.from(crearBD())
                    }
                }
            )
        );
}

function leerBDPromesa(){
    // @ts-ignore
    return new Promise(
        (resolve) => {
            fs.readFile(
                nombreBD,
                'utf-8',
                (error, contenidoLeido) => {
                    if (error) {
                        resolve({
                            mensaje: 'Base de datos vacia',
                            bdd: null
                        });
                    } else {
                        resolve({
                            mensaje: 'Si existe la Base',
                            bdd: JSON.parse(contenidoLeido)
                        });
                    }

                }
            );
        }
    );
}

function crearBD() {
    const base = '{"licores": []}';
    // @ts-ignore
    return new Promise(
        (resolve,reject) => {
            fs.writeFile(
                nombreBD,
                base,
                (err) => {
                    if(err){
                        reject({Mensaje: 'error creando Base', error: 500});
                    }else {
                        resolve({Mensaje: 'Base creada', bdd: JSON.parse(base)});
                    }
                }
            )
        }
    )
}

function guardarBase(bdd: BaseDeDatos) {
    // @ts-ignore
    return new Promise(
        (resolve,reject)=> {
            fs.writeFile(
                nombreBD,
                JSON.stringify(bdd,null,2),
                (error) => {
                    if(error){
                        reject({Mensaje: 'error guardando', error: 500});
                    } else {
                        resolve({Mensaje: 'Base guardada'});
                    }
                }
            )
        }
    )
}
function buscarLicorNombre(nombre){
    // @ts-ignore
    return new Promise(
        (resolve, reject) => {
            fs.readFile(nombreBD, 'utf-8',
                (err, contenido) => {
                    if (err) {

                        reject({mensaje: 'Error leyendo'});
                    } else {
                        const bdd = JSON.parse(contenido);
                        const respuestaFind = bdd.licores
                            .find(
                                (licor: Licor) => {
                                    return licor.nombre === nombre;
                                }
                            );

                        resolve(respuestaFind);
                    }
                });
        }
    );
}

function actualizarLicor(nombre, licor){
    // @ts-ignore
    return new Promise(
        (resolve, reject) => {
            fs.readFile(
                nombreBD,
                'utf-8',
                (error, contenidoLeido) => {
                    if (error){
                        reject('Error leyendo')
                    }  else {
                        const bdd = JSON.parse(contenidoLeido);
                        const indiceLicor = bdd.licores
                            .findIndex(
                                (licor:Licor) => {
                                    return licor.nombre === nombre;
                                }
                            );

                        bdd.licores[indiceLicor] = licor;

                        fs.writeFile(
                            nombreBD,
                            JSON.stringify(bdd, null,2),
                            (err) =>{
                                if (err){
                                    reject(err)
                                } else{
                                    resolve({
                                        mensaje: 'Licor actualizado',
                                        bdd: JSON.parse(bdd)})
                                }
                            }

                        )
                    }
                });
        }
    );
}

function eliminarLicor(nombre){
    // @ts-ignore
    return new Promise(
        (resolve, reject) => {
            fs.readFile(
                nombreBD,
                'utf-8',
                (error, contenidoLeido) => {
                    if (error){
                        reject('Error leyendo')
                    }  else {
                        const bdd = JSON.parse(contenidoLeido);
                        const indiceLicor = bdd.licores
                            .findIndex(
                                (licor:Licor) => {

                                    return licor.nombre === nombre;
                                }
                            );

                        if (indiceLicor){
                            bdd.licores
                                .splice(indiceLicor, 1);
                            resolve({
                                mensaje: 'Licor eliminada',
                                bdd: bdd
                            })
                        } else {
                            reject()
                        }

                        /*fs.writeFile(
                            nombreBD,
                            JSON.stringify(bdd, null,2),
                            (err) =>{
                                if (err){
                                    reject(err)
                                } else{
                                    resolve({
                                        mensaje: 'Licor eliminada',
                                        bdd: bdd
                                    })
                                }
                            }
                        )*/
                    }
                });
        }
    );
}

//
interface Licor {
    nombre: string;
    tipo: string;
    grado: string;
}

interface BaseDeDatos {
    licores: Licor[];
}
interface RespuestaBDD {
    mensaje: string,
    bdd: BaseDeDatos
}
interface OpcionesPregunta {
    opcionMenu: 'Crear' | 'Borrar' | 'Buscar' | 'Actualizar' |'Imprimir'
}

interface RespuestaPreguntas {
    respuestaPreguntas: OpcionesPregunta,
    respuestaBDD: RespuestaBDD
    licor?: Licor
}
/*
const first = require('rxjs/operators').first
const source = rxjs.from([1, 2, 3, 4, 5]);
//no value will pass, emit default
const example = source.pipe(first(val => val === 5, 'Nothing'));
//output: 'Nothing'
const subscribe = example.subscribe(val => console.log(val));
*/
main();