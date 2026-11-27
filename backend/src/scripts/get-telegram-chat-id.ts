import dotenv from 'dotenv';
import path from 'path';

// Cargar .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface TelegramChat {
  id: number;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  type: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: TelegramChat;
    text?: string;
    from?: {
      first_name?: string;
      username?: string;
    };
  };
  my_chat_member?: {
    chat: TelegramChat;
  };
  channel_post?: {
    chat: TelegramChat;
  };
}

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

async function obtenerChatId() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

  if (!token || token.trim() === '') {
    console.error('❌ Error: No se encontró la variable TELEGRAM_BOT_TOKEN (o BOT_TOKEN) en el archivo .env');
    console.error('👉 Asegurate de agregar en la raíz (.env):');
    console.error('   TELEGRAM_BOT_TOKEN=tu_token_aqui\n');
    process.exit(1);
  }

  console.log('🤖 Conectando con la API de Telegram...');

  try {
    // 1. Verificar identidad del Bot
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = (await meRes.json()) as TelegramResponse<TelegramBotInfo>;

    if (!meData.ok) {
      console.error(`❌ Token inválido o rechazado por Telegram: ${meData.description ?? 'Error desconocido'}`);
      process.exit(1);
    }

    console.log(`✅ Bot autenticado: @${meData.result.username} (${meData.result.first_name})`);

    // 2. Obtener actualizaciones (mensajes enviados al bot o al grupo)
    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const updatesData = (await updatesRes.json()) as TelegramResponse<TelegramUpdate[]>;

    if (!updatesData.ok) {
      console.error(`❌ Error al obtener updates: ${updatesData.description ?? 'Error desconocido'}`);
      process.exit(1);
    }

    const updates = updatesData.result;
    const chatsEncontrados = new Map<number, TelegramChat>();

    for (const update of updates) {
      const chat =
        update.message?.chat ??
        update.my_chat_member?.chat ??
        update.channel_post?.chat;

      if (chat) {
        chatsEncontrados.set(chat.id, chat);
      }
    }

    if (chatsEncontrados.size === 0) {
      console.log('\n⚠️ No se detectaron mensajes ni grupos aún.');
      console.log('------------------------------------------------------------');
      console.log('👉 Pasos para vincular el bot al grupo:');
      console.log('  1. Abrí Telegram y agregá a tu bot (@' + meData.result.username + ') al grupo de ustedes 3.');
      console.log('  2. Envíen cualquier mensaje en el grupo (ej: "hola bot" o "test").');
      console.log('  3. Volvé a ejecutar este comando:');
      console.log('     npm run telegram:chat-id');
      console.log('------------------------------------------------------------\n');
      return;
    }

    console.log('\n🎉 ¡Chats / Grupos encontrados!\n');
    for (const [id, chat] of chatsEncontrados.entries()) {
      const nombre = chat.title ?? `${chat.first_name ?? ''} ${chat.last_name ?? ''}`.trim() ?? chat.username ?? 'Sin nombre';
      const esGrupo = chat.type === 'group' || chat.type === 'supergroup';

      console.log(`📌 Tipo: ${chat.type.toUpperCase()}`);
      console.log(`   Nombre: ${nombre}`);
      console.log(`   CHAT_ID: ${id}`);
      if (esGrupo) {
        console.log(`   💡 Este es tu grupo. Copiá esta línea en tu .env:`);
        console.log(`   TELEGRAM_CHAT_ID=${id}`);
      }
      console.log('------------------------------------------------------------');
    }
  } catch (error) {
    console.error('❌ Error de conexión al consultar Telegram:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void obtenerChatId();
