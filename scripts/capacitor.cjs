/*
 * Some Windows/Node 24 environments can fail in os.userInfo() with
 * uv_os_get_passwd ENOMEM. Capacitor uses that value only to detect the shell,
 * so provide an equivalent fallback and continue the command safely.
 */
const os = require('node:os');

const getUserInfo = os.userInfo.bind(os);

os.userInfo = (options) => {
  try {
    return getUserInfo(options);
  } catch (error) {
    if (error?.code !== 'ERR_SYSTEM_ERROR') throw error;

    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME || process.env.USER || 'local-user',
      homedir: process.env.USERPROFILE || process.env.HOME || process.cwd(),
      shell: process.env.COMSPEC || process.env.SHELL || 'cmd.exe',
    };
  }
};

require('@capacitor/cli/dist/index').run();
