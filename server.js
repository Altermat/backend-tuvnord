const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const upload = multer({ dest: 'uploads/' });


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


async function connectDB() {
    try {
        await sql.connect(dbConfig);
        console.log('Conectado a SQL Server');
    } catch (err) {
        console.error('Error al conectar a SQL Server:', err);
    }
}
connectDB();

// Endpoint para subir el archivo Excel y procesarlo
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
        }

        // Leer el archivo Excel
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        
        const pool = await sql.connect(dbConfig);

        for (const row of data) {
            if (!row.Clave) {
                console.log('Fila omitida por falta de Clave:', row);
                continue; // Salta esta fila si Clave está vacío
            }

            await pool.request()
                .input('Clave', sql.NVarChar, row.Clave)
                .input('Concepto', sql.NVarChar, row.Concepto)
                .input('UnidadMedida', sql.NVarChar, row.UN || null)
                .input('Cantidad', sql.Decimal(18, 2), row.Cantidad || null)
                .input('PrecioUnitario', sql.Decimal(18, 2), row.PU || null)
                .input('Importe', sql.Decimal(18, 2), row.Importe || null)
                .query(`
                    INSERT INTO Conceptos (Clave, Concepto, UnidadMedida, Cantidad, PrecioUnitario, Importe)
                    VALUES (@Clave, @Concepto, @UnidadMedida, @Cantidad, @PrecioUnitario, @Importe)
                `);
        }

        
        res.download(req.file.path, req.file.originalname, (err) => {
            if (err) {
                console.error('Error al descargar el archivo:', err);
                res.status(500).json({ error: 'Error al descargar el archivo' });
            } else {
                
                fs.unlinkSync(req.file.path);
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
