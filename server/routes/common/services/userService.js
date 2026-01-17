const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const auth = require('../../../middleware/auth');
const cryptography = require('../../../utils/cryptography');
const userMapper = require('../mappers/userMapper');

exports.login = async (id, password) => {

  const client = await pool.connect();

  try {

    let returnValue;

    let binds = [];
    binds.push(id);

    let query = await userMapper.getUserInfo();
    
    let result = await client.query(query, binds);
    
    // 계정정보 있음
    if(result.rows.length > 0) {

      const userInfo = result.rows[0];
      
      // 계정 비활성화
      if(userInfo.enable === false) {
        returnValue = {
          status: false,
          message: '*관리자에 의해 비활성화된 계정입니다. (관리자에게 문의하세요.)'
        };

      } else if(cryptography.verifyPassword(password, userInfo.password, userInfo.salt)) {
        // 비밀번호 일치, 정상 접속
        returnValue = {
          status: true, // 정상접속
          token: await auth.signJsonWebToken(id, userInfo.user_role),
          user: {
            userId: userInfo.id,
            userName: userInfo.user_name,
            userRole: userInfo.user_role,
            useLeftMenu: userInfo.use_left_menu,
            useRightMenu: userInfo.use_right_menu,
            useBottomMenu: userInfo.use_bottom_menu,
            enable: userInfo.enable
          }
        };

      } else {
        // 비밀번호 불일치
        returnValue = {
          status: false,
          message: '*존재하지 않는 아이디이거나 잘못된 비밀번호입니다.'
        };
      }
    } else {
      // 계정정보 없음
      returnValue = {
        status: false,
        message: '*존재하지 않는 아이디이거나 잘못된 비밀번호입니다.'
      };
    }
    
    return returnValue;

  } catch (error) {
    logger.info('common/userService.js, login, error: ', error);
    console.log('common/userService.js, login, error: ', error);
  } finally {
    await client.release();
  }
}

exports.checkSession = async (token) => {

  try {

    const res = await auth.checkToken(token);

    return res;

  } catch (error) {
    logger.info('common/userService.js, checkSession, error: ', error);
    console.log('common/userService.js, checkSession, error: ', error);
  }
}

exports.changePassword = async (id, prev_password, new_password) => {

  const client = await pool.connect();
  
  try {

    let returnValue;

    let binds = [];
    binds.push(id);

    await client.query('BEGIN');
    let query = await userMapper.getUserInfo();

    const userInfo = await client.query(query, binds);
    query = '';

    // 계정정보 있음
    if(userInfo.rows.length > 0) {

      // 기존 비밀번호가 같으면
      if(cryptography.verifyPassword(prev_password, userInfo.rows[0].password, userInfo.rows[0].salt)) {

        if(prev_password === new_password) {
          returnValue = {
            status: false,
            message: '기존 비밀번호와 동일합니다. 새로운 비밀번호를 입력해주세요.'
          };
        } else {
          // 새로운 비밀번호로 수정
          const { hashedPassword, salt } = cryptography.hashPassword(new_password);

          binds = [];
          binds.push(hashedPassword);
          binds.push(salt);
          binds.push(id);

          query = await userMapper.updateChangePassword();

          await client.query(query, binds);
          await client.query('COMMIT');

          returnValue = {
            status: true,
            message: 'change password successfully'
          };
        }
          
      } else {
        // 기존 비밀번호가 다르면, 수정안함
        returnValue = {
          status: false,
          message: '*존재하지 않는 아이디이거나 잘못된 비밀번호입니다.' // 기존 비밀번호가 일치하지 않습니다.
        };
      }

    } else {
      // 계정정보 없음
      returnValue = {
        status: false,
        message: '*존재하지 않는 아이디이거나 잘못된 비밀번호입니다.'
      };
    }

    return returnValue;

  } catch (error) {
    logger.info('common/userService.js, changePassword, error: ', error);
    console.log('common/userService.js, changePassword, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.getUser = async (id) => {

  const client = await pool.connect();

  try {

    let returnValue;

    let binds = [];
    let query = '';
    
    // user_id 가 있으면
    if(id) {

      binds.push(id);

      query = await userMapper.getUserInfo();

      returnValue = await client.query(query, binds);

    } else {
      // user_id 가 없으면, 전체 검색      
      query = await userMapper.getUserList();

      returnValue = await client.query(query);
    }

    return returnValue.rows;

  } catch (error) {
    logger.info('common/userService.js, getUser, error: ', error);
    console.log('common/userService.js, getUser, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addUser = async (id, password, user_name, enable, user_role) => {

  const client = await pool.connect();

  try {

    let returnValue;

    let binds = [];
    binds.push(id);

    await client.query('BEGIN');
    let query = await userMapper.getUserInfo();
    
    const userInfo = await client.query(query, binds);
    query = '';

    // 이미 존재하는 ID
    if(userInfo.rows.length > 0) {

      returnValue = {
        status: false,
        message: '이미 존재하는 ID 입니다.'
      };
      
    // 저장
    } else {

      const { hashedPassword, salt } = cryptography.hashPassword(password);

      binds = [];
      binds.push(id);
      binds.push(hashedPassword);
      binds.push(salt);
      binds.push(user_name);
      binds.push(user_role);
      binds.push(enable);

      query = await userMapper.insertUserInfo();

      await client.query(query, binds);
      await client.query('COMMIT');

      returnValue = {
        status: true,
        message: 'added user successfully'
      };
    }
    
    return returnValue;

  } catch (error) {
    logger.info('common/userService.js, addUser, error: ', error);
    console.log('common/userService.js, addUser, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.deleteUser = async (id) => {

  const client = await pool.connect();

  try {

    let returnValue;

    let binds = [];
    binds.push(id);

    let query = await userMapper.getUserInfo();
    
    await client.query('BEGIN');
    const userInfo = await client.query(query, binds);
    query = '';

    // 삭제할 계정 정보가 있으면
    if(userInfo.rows.length > 0) {

      query = await userMapper.deleteUserInfo();

      await client.query(query, binds);
      await client.query('COMMIT');

      returnValue = {
        status: true,
        message: 'delete user successfully'
      };

    } else {
      // 삭제할 계정 정보가 없으면
      returnValue = {
        status: true,
        message: '존재하는 ID가 없습니다.'
      };
    }

    return returnValue;

  } catch (error) {
    logger.info('common/userService.js, deleteUser, error: ', error);
    console.log('common/userService.js, deleteUser, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

// 사용자 정보 수정
exports.modifyUser = async (id, prev_password, new_password, new_user_name, new_enable, changes) => {

  const client = await pool.connect();

  try {

    let returnValue;

    let binds = [];
    binds.push(id);

    let query = await userMapper.getUserInfo();

    await client.query('BEGIN');
    const userInfo = await client.query(query, binds);
    query = '';

    // 계정정보 있음
    if(userInfo.rows.length > 0) {

      if(cryptography.verifyPassword(prev_password, userInfo.rows[0].password, userInfo.rows[0].salt)) {

        // 기존 비밀번호가 같으면, 새로운 비밀번호로 수정
        if(changes.passwordChanged) {
  
          if(prev_password === new_password) {
            returnValue = {
              status: false,
              message: '기존 비밀번호와 동일합니다. 새로운 비밀번호를 입력해주세요.'
            };
          } else {
            const { hashedPassword, salt } = cryptography.hashPassword(new_password);
  
            binds = [];
            binds.push(hashedPassword);
            binds.push(salt);
            binds.push(new_user_name);
            binds.push(new_enable);
            binds.push(id);
            
            query = await userMapper.updateUserInfo();

            returnValue = {
              status: true,
              message: 'modify user successfully'
            };
          }
        } else {
          // 비밀번호 수정이 아닐 경우
          binds = [];
          binds.push(new_user_name);
          binds.push(new_enable);
          binds.push(id);
          
          query = await userMapper.updateExceptPassword();

          returnValue = {
            status: true,
            message: 'modify user successfully'
          };
        }
  
        if(query.length > 0) {
          await client.query(query, binds);
          await client.query('COMMIT');
        }

      } else {
        // 기존 비밀번호가 다르면, 수정안함
        returnValue = {
          status: false,
          message: '기존 비밀번호가 일치하지 않습니다.'
        };
      }

    } else {
      // 계정정보 없음
      returnValue = {
        status: false,
        message: '*존재하지 않는 아이디이거나 잘못된 비밀번호입니다.'
      };
    }

    return returnValue;

  } catch (error) {
    logger.info('common/userService.js, modifyUser, error: ', error);
    console.log('common/userService.js, modifyUser, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}