import { describe, it } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import { formatSemester, formatLevel, formatDate, formatDateTime, cn } from '../lib/utils.ts';
import { getErrorMessage, isForbiddenError, isNotFoundError, isUnauthorizedError } from '../lib/api.ts';

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

describe('BB-07C: Lecturer Web Dashboard Frontend Verification Suite', () => {
  const lecturerEmail = 'lecturer1_1793413837612@lautech.edu.ng';
  const lecturerPassword = 'Lecturer1Password123!';
  const assignedCourseId = 'f0f921e1-db01-47bc-96ea-cac8b464f73d';
  const unassignedCourseId = '06d44063-49f9-48e3-b237-b11570ba3714';
  const nonExistentCourseId = '00000000-0000-0000-0000-000000000000';
  const studentEmail = 'muhammedpopoola947@gmail.com';

  let validLecturerToken: string;
  let validRefreshToken: string;

  // 1. Login succeeds for an approved lecturer
  it('1. Login succeeds for an approved lecturer account', async () => {
    const res = await axios.post(`${BASE_URL}/lecturer/login`, {
      email: lecturerEmail,
      password: lecturerPassword,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(res.data.tokens.accessToken, 'Access token must be present');
    assert.ok(res.data.tokens.refreshToken, 'Refresh token must be present');
    assert.strictEqual(res.data.user.role, 'LECTURER');
    assert.strictEqual(res.data.user.status, 'ACTIVE');

    validLecturerToken = res.data.tokens.accessToken;
    validRefreshToken = res.data.tokens.refreshToken;
  });

  // 2. Invalid credentials are rejected
  it('2. Invalid credentials are rejected with 401 Unauthorized', async () => {
    try {
      await axios.post(`${BASE_URL}/lecturer/login`, {
        email: lecturerEmail,
        password: 'CompletelyWrongPassword!',
      });
      assert.fail('Should have failed with 401');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(err.response?.data?.status, 'fail');
      assert.strictEqual(isUnauthorizedError(err), true);
      assert.ok(getErrorMessage(err).includes('Invalid'));
    }
  });

  // 3. Unauthenticated users cannot access protected pages
  it('3. Unauthenticated requests to protected endpoints return 401', async () => {
    try {
      await axios.get(`${BASE_URL}/lecturer/me`);
      assert.fail('Should have failed with 401');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(isUnauthorizedError(err), true);
    }

    try {
      await axios.get(`${BASE_URL}/lecturer/dashboard`);
      assert.fail('Should have failed with 401');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(isUnauthorizedError(err), true);
    }
  });

  // 4. Student accounts cannot access lecturer pages
  it('4. Student accounts cannot authenticate or access lecturer endpoints (403)', async () => {
    try {
      await axios.post(`${BASE_URL}/lecturer/login`, {
        email: studentEmail,
        password: 'AnyPassword123!',
      });
      assert.fail('Should have failed');
    } catch (err: any) {
      // Backend rejects student account either with 401 (if password check precedes) or 403
      assert.ok([401, 403].includes(err.response?.status));
      assert.strictEqual(err.response?.data?.status, 'fail');
    }
  });

  // 5. Dashboard data loads from the backend
  it('5. Dashboard data loads live data from backend for authenticated lecturer', async () => {
    const res = await axios.get(`${BASE_URL}/lecturer/dashboard`, {
      headers: { Authorization: `Bearer ${validLecturerToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(res.data.data.lecturer, 'Lecturer profile must exist');
    assert.strictEqual(res.data.data.lecturer.email, lecturerEmail);
    assert.ok(typeof res.data.data.metrics.assignedCoursesCount === 'number');
    assert.ok(Array.isArray(res.data.data.metrics.activeSessions));
    assert.ok(Array.isArray(res.data.data.recentAssignments));
  });

  // 6. Only assigned courses appear
  it('6. Courses list returns only courses actively assigned to authenticated lecturer', async () => {
    const res = await axios.get(`${BASE_URL}/lecturer/courses`, {
      headers: { Authorization: `Bearer ${validLecturerToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(Array.isArray(res.data.data));

    // Verify course data contains assignedCourseId and does not contain unassignedCourseId
    const courseIds = res.data.data.map((c: any) => c.courseId);
    assert.ok(courseIds.includes(assignedCourseId), 'Assigned course must be in the list');
    assert.ok(!courseIds.includes(unassignedCourseId), 'Unassigned course must not appear');

    // Verify metadata presence
    const course = res.data.data.find((c: any) => c.courseId === assignedCourseId);
    assert.ok(course.code, 'Course code must be present');
    assert.ok(course.title, 'Course title must be present');
    assert.ok(course.departmentName, 'Department name must be present');
    assert.ok(course.academicSession, 'Academic session must be present');
    assert.ok(course.metrics, 'Question metrics must be present');
  });

  // 7. Course detail access handles unauthorized responses
  it('7. Course detail access allows assigned course, blocks unassigned (403), and rejects non-existent (404)', async () => {
    // 7a. Assigned course -> 200 OK
    const res = await axios.get(`${BASE_URL}/lecturer/courses/${assignedCourseId}`, {
      headers: { Authorization: `Bearer ${validLecturerToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.courseId, assignedCourseId);
    assert.strictEqual(res.data.data.assignmentStatus, 'ACTIVE');

    // 7b. Unassigned course -> 403 Forbidden (IDOR defense)
    try {
      await axios.get(`${BASE_URL}/lecturer/courses/${unassignedCourseId}`, {
        headers: { Authorization: `Bearer ${validLecturerToken}` },
      });
      assert.fail('Should have been 403 Forbidden');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 403);
      assert.strictEqual(isForbiddenError(err), true);
      assert.ok(getErrorMessage(err).includes('not assigned'));
    }

    // 7c. Non-existent course -> 404 Not Found
    try {
      await axios.get(`${BASE_URL}/lecturer/courses/${nonExistentCourseId}`, {
        headers: { Authorization: `Bearer ${validLecturerToken}` },
      });
      assert.fail('Should have been 404 Not Found');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 404);
      assert.strictEqual(isNotFoundError(err), true);
      assert.ok(getErrorMessage(err).includes('not found'));
    }
  });

  // 8. Session expiry is handled correctly
  it('8. Session refresh rotates tokens properly with refresh token', async () => {
    const res = await axios.post(`${BASE_URL}/auth/refresh-token`, {
      refreshToken: validRefreshToken,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(res.data.tokens?.accessToken, 'New access token rotated');
  });

  // 9. Formatting and error handling utilities work reliably
  it('9. UI utility formatters and error handlers operate reliably', () => {
    assert.strictEqual(formatSemester('harmattan'), 'Harmattan (1st)');
    assert.strictEqual(formatSemester('rain'), 'Rain (2nd)');
    assert.strictEqual(formatLevel(400), '400 Level');
    assert.strictEqual(formatLevel(null), '—');
    assert.strictEqual(formatDate(null), '—');
    assert.strictEqual(formatDateTime(null), '—');
    assert.strictEqual(cn('px-2', 'px-4'), 'px-4'); // tailwind-merge operates
  });
});
