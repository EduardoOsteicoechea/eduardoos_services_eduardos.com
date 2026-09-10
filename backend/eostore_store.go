package main

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colEostoreCompanies = "eostore_companies"
	colEostoreSections  = "eostore_sections"
	colEostoreTypes     = "eostore_types"
	colEostoreProducts  = "eostore_products"
)

// EostoreStore persists catalog hierarchy and products.
type EostoreStore interface {
	InsertCompany(ctx context.Context, c *EostoreCompany) error
	UpdateCompany(ctx context.Context, c *EostoreCompany) error
	GetCompany(ctx context.Context, guid string) (*EostoreCompany, error)
	GetCompanyByFriendlyID(ctx context.Context, id string) (*EostoreCompany, error)
	ListCompanies(ctx context.Context) ([]*EostoreCompany, error)
	DeleteCompany(ctx context.Context, guid string) error

	InsertSection(ctx context.Context, s *EostoreSection) error
	UpdateSection(ctx context.Context, s *EostoreSection) error
	GetSection(ctx context.Context, guid string) (*EostoreSection, error)
	GetSectionByFriendlyID(ctx context.Context, companyGUID, id string) (*EostoreSection, error)
	ListSections(ctx context.Context, companyGUID string) ([]*EostoreSection, error)
	DeleteSection(ctx context.Context, guid string) error

	InsertType(ctx context.Context, t *EostoreType) error
	UpdateType(ctx context.Context, t *EostoreType) error
	GetType(ctx context.Context, guid string) (*EostoreType, error)
	GetTypeByFriendlyID(ctx context.Context, sectionGUID, id string) (*EostoreType, error)
	ListTypes(ctx context.Context, companyGUID, sectionGUID string) ([]*EostoreType, error)
	DeleteType(ctx context.Context, guid string) error

	InsertProduct(ctx context.Context, p *EostoreProduct) error
	UpdateProduct(ctx context.Context, p *EostoreProduct) error
	GetProduct(ctx context.Context, guid string) (*EostoreProduct, error)
	GetProductByFriendlyID(ctx context.Context, companyGUID, id string) (*EostoreProduct, error)
	ListProducts(ctx context.Context, companyGUID, sectionGUID, typeGUID string) ([]*EostoreProduct, error)
	DeleteProduct(ctx context.Context, guid string) error
}

func openEostoreStore(store DataStore) EostoreStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return &mongoEostoreStore{db: ms.db}
	}
	return newMemoryEostoreStore()
}

type memoryEostoreStore struct {
	mu         sync.RWMutex
	companies  map[string]*EostoreCompany
	sections   map[string]*EostoreSection
	types      map[string]*EostoreType
	products   map[string]*EostoreProduct
}

func newMemoryEostoreStore() *memoryEostoreStore {
	return &memoryEostoreStore{
		companies: map[string]*EostoreCompany{},
		sections:  map[string]*EostoreSection{},
		types:     map[string]*EostoreType{},
		products:  map[string]*EostoreProduct{},
	}
}

func (s *memoryEostoreStore) InsertCompany(_ context.Context, c *EostoreCompany) error {
	if c == nil || c.GUID == "" || c.FriendlyID == "" {
		return fmt.Errorf("company required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.companies {
		if existing != nil && existing.FriendlyID == c.FriendlyID {
			return errConflict
		}
	}
	s.companies[c.GUID] = c.clone()
	return nil
}

func (s *memoryEostoreStore) UpdateCompany(_ context.Context, c *EostoreCompany) error {
	if c == nil || c.GUID == "" {
		return fmt.Errorf("company required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.companies[c.GUID]; !ok {
		return errNotFound
	}
	for _, existing := range s.companies {
		if existing != nil && existing.GUID != c.GUID && existing.FriendlyID == c.FriendlyID {
			return errConflict
		}
	}
	s.companies[c.GUID] = c.clone()
	return nil
}

func (s *memoryEostoreStore) GetCompany(_ context.Context, guid string) (*EostoreCompany, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.companies[guid]
	if !ok || c == nil {
		return nil, errNotFound
	}
	return c.clone(), nil
}

func (s *memoryEostoreStore) GetCompanyByFriendlyID(_ context.Context, id string) (*EostoreCompany, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, c := range s.companies {
		if c != nil && c.FriendlyID == id {
			return c.clone(), nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEostoreStore) ListCompanies(_ context.Context) ([]*EostoreCompany, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*EostoreCompany, 0, len(s.companies))
	for _, c := range s.companies {
		if c != nil {
			out = append(out, c.clone())
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *memoryEostoreStore) DeleteCompany(_ context.Context, guid string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.companies[guid]; !ok {
		return errNotFound
	}
	for _, sec := range s.sections {
		if sec != nil && sec.CompanyGUID == guid {
			return errConflict
		}
	}
	delete(s.companies, guid)
	return nil
}

func (s *memoryEostoreStore) InsertSection(_ context.Context, sec *EostoreSection) error {
	if sec == nil || sec.GUID == "" || sec.FriendlyID == "" || sec.CompanyGUID == "" {
		return fmt.Errorf("section required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.companies[sec.CompanyGUID]; !ok {
		return errNotFound
	}
	for _, existing := range s.sections {
		if existing != nil && existing.CompanyGUID == sec.CompanyGUID && existing.FriendlyID == sec.FriendlyID {
			return errConflict
		}
	}
	s.sections[sec.GUID] = sec.clone()
	return nil
}

func (s *memoryEostoreStore) UpdateSection(_ context.Context, sec *EostoreSection) error {
	if sec == nil || sec.GUID == "" {
		return fmt.Errorf("section required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.sections[sec.GUID]; !ok {
		return errNotFound
	}
	for _, existing := range s.sections {
		if existing != nil && existing.GUID != sec.GUID && existing.CompanyGUID == sec.CompanyGUID && existing.FriendlyID == sec.FriendlyID {
			return errConflict
		}
	}
	s.sections[sec.GUID] = sec.clone()
	return nil
}

func (s *memoryEostoreStore) GetSection(_ context.Context, guid string) (*EostoreSection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sec, ok := s.sections[guid]
	if !ok || sec == nil {
		return nil, errNotFound
	}
	return sec.clone(), nil
}

func (s *memoryEostoreStore) GetSectionByFriendlyID(_ context.Context, companyGUID, id string) (*EostoreSection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, sec := range s.sections {
		if sec != nil && sec.CompanyGUID == companyGUID && sec.FriendlyID == id {
			return sec.clone(), nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEostoreStore) ListSections(_ context.Context, companyGUID string) ([]*EostoreSection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*EostoreSection, 0)
	for _, sec := range s.sections {
		if sec == nil {
			continue
		}
		if companyGUID != "" && sec.CompanyGUID != companyGUID {
			continue
		}
		out = append(out, sec.clone())
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *memoryEostoreStore) DeleteSection(_ context.Context, guid string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.sections[guid]; !ok {
		return errNotFound
	}
	for _, t := range s.types {
		if t != nil && t.SectionGUID == guid {
			return errConflict
		}
	}
	delete(s.sections, guid)
	return nil
}

func (s *memoryEostoreStore) InsertType(_ context.Context, typ *EostoreType) error {
	if typ == nil || typ.GUID == "" || typ.FriendlyID == "" || typ.SectionGUID == "" {
		return fmt.Errorf("type required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	sec, ok := s.sections[typ.SectionGUID]
	if !ok || sec == nil {
		return errNotFound
	}
	if typ.CompanyGUID == "" {
		typ.CompanyGUID = sec.CompanyGUID
	}
	for _, existing := range s.types {
		if existing != nil && existing.SectionGUID == typ.SectionGUID && existing.FriendlyID == typ.FriendlyID {
			return errConflict
		}
	}
	s.types[typ.GUID] = typ.clone()
	return nil
}

func (s *memoryEostoreStore) UpdateType(_ context.Context, typ *EostoreType) error {
	if typ == nil || typ.GUID == "" {
		return fmt.Errorf("type required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.types[typ.GUID]; !ok {
		return errNotFound
	}
	for _, existing := range s.types {
		if existing != nil && existing.GUID != typ.GUID && existing.SectionGUID == typ.SectionGUID && existing.FriendlyID == typ.FriendlyID {
			return errConflict
		}
	}
	s.types[typ.GUID] = typ.clone()
	return nil
}

func (s *memoryEostoreStore) GetType(_ context.Context, guid string) (*EostoreType, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.types[guid]
	if !ok || t == nil {
		return nil, errNotFound
	}
	return t.clone(), nil
}

func (s *memoryEostoreStore) GetTypeByFriendlyID(_ context.Context, sectionGUID, id string) (*EostoreType, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, t := range s.types {
		if t != nil && t.SectionGUID == sectionGUID && t.FriendlyID == id {
			return t.clone(), nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEostoreStore) ListTypes(_ context.Context, companyGUID, sectionGUID string) ([]*EostoreType, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*EostoreType, 0)
	for _, t := range s.types {
		if t == nil {
			continue
		}
		if companyGUID != "" && t.CompanyGUID != companyGUID {
			continue
		}
		if sectionGUID != "" && t.SectionGUID != sectionGUID {
			continue
		}
		out = append(out, t.clone())
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *memoryEostoreStore) DeleteType(_ context.Context, guid string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.types[guid]; !ok {
		return errNotFound
	}
	for _, p := range s.products {
		if p != nil && p.TypeGUID == guid {
			return errConflict
		}
	}
	delete(s.types, guid)
	return nil
}

func (s *memoryEostoreStore) InsertProduct(_ context.Context, p *EostoreProduct) error {
	if p == nil || p.GUID == "" || p.FriendlyID == "" || p.TypeGUID == "" {
		return fmt.Errorf("product required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	typ, ok := s.types[p.TypeGUID]
	if !ok || typ == nil {
		return errNotFound
	}
	if p.CompanyGUID == "" {
		p.CompanyGUID = typ.CompanyGUID
	}
	if p.SectionGUID == "" {
		p.SectionGUID = typ.SectionGUID
	}
	for _, existing := range s.products {
		if existing != nil && existing.CompanyGUID == p.CompanyGUID && existing.FriendlyID == p.FriendlyID {
			return errConflict
		}
	}
	s.products[p.GUID] = p.clone()
	return nil
}

func (s *memoryEostoreStore) UpdateProduct(_ context.Context, p *EostoreProduct) error {
	if p == nil || p.GUID == "" {
		return fmt.Errorf("product required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.products[p.GUID]; !ok {
		return errNotFound
	}
	for _, existing := range s.products {
		if existing != nil && existing.GUID != p.GUID && existing.CompanyGUID == p.CompanyGUID && existing.FriendlyID == p.FriendlyID {
			return errConflict
		}
	}
	s.products[p.GUID] = p.clone()
	return nil
}

func (s *memoryEostoreStore) GetProduct(_ context.Context, guid string) (*EostoreProduct, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.products[guid]
	if !ok || p == nil {
		return nil, errNotFound
	}
	return p.clone(), nil
}

func (s *memoryEostoreStore) GetProductByFriendlyID(_ context.Context, companyGUID, id string) (*EostoreProduct, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.products {
		if p != nil && p.CompanyGUID == companyGUID && p.FriendlyID == id {
			return p.clone(), nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEostoreStore) ListProducts(_ context.Context, companyGUID, sectionGUID, typeGUID string) ([]*EostoreProduct, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*EostoreProduct, 0)
	for _, p := range s.products {
		if p == nil {
			continue
		}
		if companyGUID != "" && p.CompanyGUID != companyGUID {
			continue
		}
		if sectionGUID != "" && p.SectionGUID != sectionGUID {
			continue
		}
		if typeGUID != "" && p.TypeGUID != typeGUID {
			continue
		}
		out = append(out, p.clone())
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *memoryEostoreStore) DeleteProduct(_ context.Context, guid string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.products[guid]; !ok {
		return errNotFound
	}
	delete(s.products, guid)
	return nil
}

type mongoEostoreStore struct {
	db *mongo.Database
}

func (s *mongoEostoreStore) companies() *mongo.Collection { return s.db.Collection(colEostoreCompanies) }
func (s *mongoEostoreStore) sections() *mongo.Collection  { return s.db.Collection(colEostoreSections) }
func (s *mongoEostoreStore) types() *mongo.Collection     { return s.db.Collection(colEostoreTypes) }
func (s *mongoEostoreStore) products() *mongo.Collection  { return s.db.Collection(colEostoreProducts) }

func (s *mongoEostoreStore) InsertCompany(ctx context.Context, c *EostoreCompany) error {
	_, err := s.companies().InsertOne(ctx, c)
	if mongo.IsDuplicateKeyError(err) {
		return errConflict
	}
	return err
}

func (s *mongoEostoreStore) UpdateCompany(ctx context.Context, c *EostoreCompany) error {
	res, err := s.companies().ReplaceOne(ctx, bson.M{"_id": c.GUID}, c)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return errConflict
		}
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEostoreStore) GetCompany(ctx context.Context, guid string) (*EostoreCompany, error) {
	var c EostoreCompany
	err := s.companies().FindOne(ctx, bson.M{"_id": guid}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *mongoEostoreStore) GetCompanyByFriendlyID(ctx context.Context, id string) (*EostoreCompany, error) {
	var c EostoreCompany
	err := s.companies().FindOne(ctx, bson.M{"friendly_id": id}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *mongoEostoreStore) ListCompanies(ctx context.Context) ([]*EostoreCompany, error) {
	cur, err := s.companies().Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*EostoreCompany
	for cur.Next(ctx) {
		var c EostoreCompany
		if err := cur.Decode(&c); err != nil {
			return nil, err
		}
		out = append(out, &c)
	}
	return out, cur.Err()
}

func (s *mongoEostoreStore) DeleteCompany(ctx context.Context, guid string) error {
	n, err := s.sections().CountDocuments(ctx, bson.M{"company_guid": guid})
	if err != nil {
		return err
	}
	if n > 0 {
		return errConflict
	}
	res, err := s.companies().DeleteOne(ctx, bson.M{"_id": guid})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEostoreStore) InsertSection(ctx context.Context, sec *EostoreSection) error {
	_, err := s.sections().InsertOne(ctx, sec)
	if mongo.IsDuplicateKeyError(err) {
		return errConflict
	}
	return err
}

func (s *mongoEostoreStore) UpdateSection(ctx context.Context, sec *EostoreSection) error {
	res, err := s.sections().ReplaceOne(ctx, bson.M{"_id": sec.GUID}, sec)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return errConflict
		}
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEostoreStore) GetSection(ctx context.Context, guid string) (*EostoreSection, error) {
	var sec EostoreSection
	err := s.sections().FindOne(ctx, bson.M{"_id": guid}).Decode(&sec)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &sec, nil
}

func (s *mongoEostoreStore) GetSectionByFriendlyID(ctx context.Context, companyGUID, id string) (*EostoreSection, error) {
	var sec EostoreSection
	err := s.sections().FindOne(ctx, bson.M{"company_guid": companyGUID, "friendly_id": id}).Decode(&sec)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &sec, nil
}

func (s *mongoEostoreStore) ListSections(ctx context.Context, companyGUID string) ([]*EostoreSection, error) {
	filter := bson.M{}
	if companyGUID != "" {
		filter["company_guid"] = companyGUID
	}
	cur, err := s.sections().Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*EostoreSection
	for cur.Next(ctx) {
		var sec EostoreSection
		if err := cur.Decode(&sec); err != nil {
			return nil, err
		}
		out = append(out, &sec)
	}
	return out, cur.Err()
}

func (s *mongoEostoreStore) DeleteSection(ctx context.Context, guid string) error {
	n, err := s.types().CountDocuments(ctx, bson.M{"section_guid": guid})
	if err != nil {
		return err
	}
	if n > 0 {
		return errConflict
	}
	res, err := s.sections().DeleteOne(ctx, bson.M{"_id": guid})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEostoreStore) InsertType(ctx context.Context, typ *EostoreType) error {
	_, err := s.types().InsertOne(ctx, typ)
	if mongo.IsDuplicateKeyError(err) {
		return errConflict
	}
	return err
}

func (s *mongoEostoreStore) UpdateType(ctx context.Context, typ *EostoreType) error {
	res, err := s.types().ReplaceOne(ctx, bson.M{"_id": typ.GUID}, typ)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return errConflict
		}
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEostoreStore) GetType(ctx context.Context, guid string) (*EostoreType, error) {
	var typ EostoreType
	err := s.types().FindOne(ctx, bson.M{"_id": guid}).Decode(&typ)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &typ, nil
}

func (s *mongoEostoreStore) GetTypeByFriendlyID(ctx context.Context, sectionGUID, id string) (*EostoreType, error) {
	var typ EostoreType
	err := s.types().FindOne(ctx, bson.M{"section_guid": sectionGUID, "friendly_id": id}).Decode(&typ)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &typ, nil
}

func (s *mongoEostoreStore) ListTypes(ctx context.Context, companyGUID, sectionGUID string) ([]*EostoreType, error) {
	filter := bson.M{}
	if companyGUID != "" {
		filter["company_guid"] = companyGUID
	}
	if sectionGUID != "" {
		filter["section_guid"] = sectionGUID
	}
	cur, err := s.types().Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*EostoreType
	for cur.Next(ctx) {
		var typ EostoreType
		if err := cur.Decode(&typ); err != nil {
			return nil, err
		}
		out = append(out, &typ)
	}
	return out, cur.Err()
}

func (s *mongoEostoreStore) DeleteType(ctx context.Context, guid string) error {
	n, err := s.products().CountDocuments(ctx, bson.M{"type_guid": guid})
	if err != nil {
		return err
	}
	if n > 0 {
		return errConflict
	}
	res, err := s.types().DeleteOne(ctx, bson.M{"_id": guid})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEostoreStore) InsertProduct(ctx context.Context, p *EostoreProduct) error {
	_, err := s.products().InsertOne(ctx, p)
	if mongo.IsDuplicateKeyError(err) {
		return errConflict
	}
	return err
}

func (s *mongoEostoreStore) UpdateProduct(ctx context.Context, p *EostoreProduct) error {
	res, err := s.products().ReplaceOne(ctx, bson.M{"_id": p.GUID}, p)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return errConflict
		}
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEostoreStore) GetProduct(ctx context.Context, guid string) (*EostoreProduct, error) {
	var p EostoreProduct
	err := s.products().FindOne(ctx, bson.M{"_id": guid}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *mongoEostoreStore) GetProductByFriendlyID(ctx context.Context, companyGUID, id string) (*EostoreProduct, error) {
	var p EostoreProduct
	err := s.products().FindOne(ctx, bson.M{"company_guid": companyGUID, "friendly_id": id}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *mongoEostoreStore) ListProducts(ctx context.Context, companyGUID, sectionGUID, typeGUID string) ([]*EostoreProduct, error) {
	filter := bson.M{}
	if companyGUID != "" {
		filter["company_guid"] = companyGUID
	}
	if sectionGUID != "" {
		filter["section_guid"] = sectionGUID
	}
	if typeGUID != "" {
		filter["type_guid"] = typeGUID
	}
	cur, err := s.products().Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*EostoreProduct
	for cur.Next(ctx) {
		var p EostoreProduct
		if err := cur.Decode(&p); err != nil {
			return nil, err
		}
		out = append(out, &p)
	}
	return out, cur.Err()
}

func (s *mongoEostoreStore) DeleteProduct(ctx context.Context, guid string) error {
	res, err := s.products().DeleteOne(ctx, bson.M{"_id": guid})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return errNotFound
	}
	return nil
}
