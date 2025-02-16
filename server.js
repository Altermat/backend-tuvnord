const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de la base de datos
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

// Conectar a la base de datos
async function connectDB() {
    try {
        await sql.connect(dbConfig);
        console.log('Conectado a SQL Server');
    } catch (err) {
        console.error('Error al conectar a SQL Server:', err);
    }
}
connectDB();

// Nueva ruta para obtener los datos según tu consulta
app.get('/api/datos', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT 
                a.Clave,
                a.Concepto,
                NULL AS UN,
                NULL AS Cantidad,
                NULL AS PU,
                NULL AS Importe
            FROM Agrupadores a
            WHERE a.Nivel >= 2 -- Excluye el ROOT
            
            UNION ALL
            
            SELECT 
                c.Clave,
                c.Concepto,
                c.UnidadMedida AS UN,
                c.Cantidad,
                c.PrecioUnitario AS PU,
                c.Importe
            FROM Conceptos c
            ORDER BY Clave;
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
