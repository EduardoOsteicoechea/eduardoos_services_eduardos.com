package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const colEostoreCarts = "eostore_carts"

// EostoreCartItem is one line in a per-company cart.
type EostoreCartItem struct {
	ProductGUID string `json:"product_guid" bson:"product_guid"`
	Units       int    `json:"units" bson:"units"`
}

// EostoreCart is a user's shopping cart for one company.
type EostoreCart struct {
	ID          string           `json:"id" bson:"_id"`
	UserID      string           `json:"user_id" bson:"user_id"`
	CompanyGUID string           `json:"company_guid" bson:"company_guid"`
	Items       []EostoreCartItem `json:"items" bson:"items"`
	UpdatedAt   time.Time        `json:"updated_at" bson:"updated_at"`
}

func (c *EostoreCart) clone() *EostoreCart {
	if c == nil {
		return nil
	}
	cp := *c
	if c.Items != nil {
		cp.Items = append([]EostoreCartItem(nil), c.Items...)
	}
	return &cp
}

func eostoreCartID(userID, companyGUID string) string {
	return userID + ":" + companyGUID
}

// EostoreCartStore persists per-user company carts.
type EostoreCartStore interface {
	GetCart(ctx context.Context, userID, companyGUID string) (*EostoreCart, error)
	UpsertCart(ctx context.Context, cart *EostoreCart) error
	DeleteCart(ctx context.Context, userID, companyGUID string) error
}

func openEostoreCartStore(store DataStore) EostoreCartStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return &mongoEostoreCartStore{db: ms.db}
	}
	return newMemoryEostoreCartStore()
}

type memoryEostoreCartStore struct {
	mu    sync.RWMutex
	carts map[string]*EostoreCart
}

func newMemoryEostoreCartStore() *memoryEostoreCartStore {
	return &memoryEostoreCartStore{carts: map[string]*EostoreCart{}}
}

func (s *memoryEostoreCartStore) GetCart(_ context.Context, userID, companyGUID string) (*EostoreCart, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.carts[eostoreCartID(userID, companyGUID)]
	if !ok || c == nil {
		return &EostoreCart{
			ID:          eostoreCartID(userID, companyGUID),
			UserID:      userID,
			CompanyGUID: companyGUID,
			Items:       []EostoreCartItem{},
		}, nil
	}
	return c.clone(), nil
}

func (s *memoryEostoreCartStore) UpsertCart(_ context.Context, cart *EostoreCart) error {
	if cart == nil || cart.UserID == "" || cart.CompanyGUID == "" {
		return fmt.Errorf("cart required")
	}
	cart.ID = eostoreCartID(cart.UserID, cart.CompanyGUID)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.carts[cart.ID] = cart.clone()
	return nil
}

func (s *memoryEostoreCartStore) DeleteCart(_ context.Context, userID, companyGUID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.carts, eostoreCartID(userID, companyGUID))
	return nil
}

type mongoEostoreCartStore struct {
	db *mongo.Database
}

func (s *mongoEostoreCartStore) col() *mongo.Collection {
	return s.db.Collection(colEostoreCarts)
}

func (s *mongoEostoreCartStore) GetCart(ctx context.Context, userID, companyGUID string) (*EostoreCart, error) {
	id := eostoreCartID(userID, companyGUID)
	var c EostoreCart
	err := s.col().FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return &EostoreCart{
			ID: id, UserID: userID, CompanyGUID: companyGUID, Items: []EostoreCartItem{},
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *mongoEostoreCartStore) UpsertCart(ctx context.Context, cart *EostoreCart) error {
	if cart == nil || cart.UserID == "" || cart.CompanyGUID == "" {
		return fmt.Errorf("cart required")
	}
	cart.ID = eostoreCartID(cart.UserID, cart.CompanyGUID)
	_, err := s.col().ReplaceOne(ctx, bson.M{"_id": cart.ID}, cart, options.Replace().SetUpsert(true))
	return err
}

func (s *mongoEostoreCartStore) DeleteCart(ctx context.Context, userID, companyGUID string) error {
	_, err := s.col().DeleteOne(ctx, bson.M{"_id": eostoreCartID(userID, companyGUID)})
	return err
}
