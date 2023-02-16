const calculo = (limite) => {
    const array = [];    

    for (let i = 0; i < limite; i++) {
        const objecto = {
            numero: 0,
            cantidad: 0
        };

        let numerorandom = Math.round(Math.random() * i);        
      
        if( array.length === 0 ) 
        {
            objecto.numero = numerorandom;
            objecto.cantidad = 1;
            array.push(objecto);
        }
        else
        {
            if (array.find(elemento => elemento.numero === numerorandom)) 
             {
                const index = array.findIndex(elemento => elemento.numero === numerorandom);
                const nCuenta = array[index].cantidad + 1;
                array[index].cantidad = nCuenta;
              } 
              else 
              {
                objecto.numero = numerorandom;
                objecto.cantidad = 1;
                array.push(objecto);
              }            
        }
    }
    
    return array;
}

process.on('message', msg => {
    const array = calculo(msg.limite)
    process.send(array);
})

process.send('listo');