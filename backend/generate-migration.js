const path = require('path');
const tsNode = require('ts-node');

// Register TypeScript compilation
tsNode.register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
    },
});

// Resolve the data source path
const dataSourcePath = path.resolve(__dirname, 'src/typeorm/data-source.ts');

try {
    // Load the DataSource from the resolved path
    const { AppDataSource } = require(dataSourcePath);
    
    // Ensure the migrations output directory is set to the correct location
    AppDataSource.options.migrationsDir = path.resolve(__dirname, 'src/typeorm/migrations');

    module.exports = AppDataSource;
} catch (error) {
    console.error('Error loading AppDataSource:', error);
    throw error;
}
