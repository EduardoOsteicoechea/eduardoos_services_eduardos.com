package main

import (
	"context"
	"net/http"
)

// resolveEoschoolCurriculumOwner returns the data-owner id for studentKey as
// seen by actor: tutor assignments first, otherwise the actor's own namespace
// (GetOrCreate / materials may create docs under that owner).
func (a *App) resolveEoschoolCurriculumOwner(ctx context.Context, actor *User, studentKey string) (string, bool, error) {
	if actor == nil {
		return "", false, nil
	}
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	if studentKey == "" {
		return "", false, nil
	}
	asg, ok, err := a.curriculumTutors.GetByTutorStudent(ctx, actor.ID, studentKey)
	if err != nil {
		return "", false, err
	}
	if ok {
		return asg.OwnerUserID, true, nil
	}
	return actor.ID, true, nil
}

func (a *App) canAccessEoschoolCurriculumOwnerStudent(ctx context.Context, actor *User, ownerUserID, studentKey string) (bool, error) {
	if actor == nil || ownerUserID == "" {
		return false, nil
	}
	if actor.ID == ownerUserID {
		return true, nil
	}
	return a.curriculumTutors.HasAssignment(ctx, actor.ID, ownerUserID, studentKey)
}

func (a *App) requireEoschoolCurriculumOwner(w http.ResponseWriter, r *http.Request, studentKey string) (*User, string, bool) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return nil, "", false
	}
	ownerID, found, err := a.resolveEoschoolCurriculumOwner(r.Context(), user, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil, "", false
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil, "", false
	}
	return user, ownerID, true
}

func (a *App) canAccessEoschoolCurriculumMaterial(ctx context.Context, actor *User, m EoschoolCurriculumMaterial) (bool, error) {
	if actor == nil {
		return false, nil
	}
	return a.canAccessEoschoolCurriculumOwnerStudent(ctx, actor, m.OwnerUserID, m.StudentKey)
}

func (a *App) listEoschoolCurriculumStudentsVisible(ctx context.Context, user *User) ([]EoschoolCurriculumStudent, error) {
	own, err := a.eoschoolCurriculum.ListStudents(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	out := make([]EoschoolCurriculumStudent, 0, len(own)+4)
	seen := map[string]struct{}{}
	for _, s := range own {
		seen[s.StudentKey] = struct{}{}
		out = append(out, s)
	}
	assigned, err := a.curriculumTutors.ListByTutor(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	for _, asg := range assigned {
		if _, dup := seen[asg.StudentKey]; dup {
			continue
		}
		doc, found, err := a.eoschoolCurriculum.Get(ctx, asg.OwnerUserID, asg.StudentKey)
		if err != nil {
			return nil, err
		}
		if !found {
			continue
		}
		seen[asg.StudentKey] = struct{}{}
		out = append(out, doc.studentView())
	}
	return out, nil
}
