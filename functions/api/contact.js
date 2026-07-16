// しばのHP お問い合わせフォーム受信 (Cloudflare Pages Function)
// 沖田園HP等と同じ MailChannels 方式。
// 必要な環境変数（Cloudflare Pages のシークレット）:
//   MAILCHANNELS_API_KEY … MailChannels APIキー
//   DKIM_PRIVATE_KEY      … DKIM秘密鍵（shibano.info のDNSに公開鍵を設定後に有効化）

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return json({ error: '必須項目（お名前・メール・メッセージ）が不足しています' }, 400);
    }

    const mailPayload = {
      personalizations: [{
        to: [{ email: 'i.onoue@gmail.com', name: 'しばの後援会' }],
        dkim_domain: 'shibano.info',
        dkim_selector: 'mailchannels',
        dkim_private_key: env.DKIM_PRIVATE_KEY,
      }],
      from: { email: 'noreply@shibano.info', name: 'しばのHP お問い合わせ' },
      reply_to: { email: email, name: name },
      subject: `【しばのHP】お問い合わせ（${name} 様）`,
      content: [{
        type: 'text/plain',
        value: `しばの公式ホームページからお問い合わせがありました。\n\n` +
               `お名前：${name}\n` +
               `メール：${email}\n\n` +
               `【メッセージ】\n${message}`,
      }],
    };

    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': env.MAILCHANNELS_API_KEY,
      },
      body: JSON.stringify(mailPayload),
    });

    if (response.status === 202) {
      return json({ success: true });
    }

    const responseText = await response.text();
    return json({
      success: false,
      error: '送信に失敗しました。しばらくしてから再度お試しください。',
      debug: { status: response.status, body: responseText },
    }, 500);

  } catch (e) {
    return json({ error: 'サーバーエラーが発生しました', detail: e.message }, 500);
  }
}

// GET: 設定確認（シークレットが入っているかだけ返す。値は返さない）
export async function onRequestGet(context) {
  const { env } = context;
  return json({
    ok: true,
    hasApiKey: !!env.MAILCHANNELS_API_KEY,
    hasDkimKey: !!env.DKIM_PRIVATE_KEY,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
