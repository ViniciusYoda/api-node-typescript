import { Knex } from './server/database/knex';
import { server } from './server/Server';


const startServer = () => {
  server.listen(process.env.PORT || 3333, () => {
    console.log(`App rodando na porta ${process.env.PORT || 3333}`);
  });
};


const start = async () => {
  if (process.env.IS_LOCALHOST !== 'true') {
    console.log('Rodando migrations');

    try {
      await Knex.migrate.latest();
      await Knex.seed.run();
    } catch (error) {
      console.error('Erro ao preparar o banco de dados:', error);
      try {
        await Knex.destroy();
      } catch (closeError) {
        console.error('Erro ao fechar as conexões do banco de dados:', closeError);
      }
      process.exitCode = 1;
      return;
    }
  }

  startServer();
};

void start();