package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		itemsCollection, err := app.FindCollectionByNameOrId("items")
		if err != nil {
			return err
		}

		collection := core.NewBaseCollection("item_reports")

		collection.Fields.Add(
			&core.RelationField{
				Name:         "item",
				Required:     true,
				CollectionId: itemsCollection.Id,
				MaxSelect:    types.Pointer(1),
			},
			&core.TextField{Name: "reporter_name", Required: true},
			&core.SelectField{
				Name:     "reported_status",
				Required: true,
				Values:   []string{"正常", "使用中", "余量低", "已耗尽", "损坏/失效", "位置不明"},
			},
			&core.TextField{Name: "note", Required: false},
			&core.SelectField{
				Name:     "review_status",
				Required: true,
				Values:   []string{"待审核", "已通过", "已拒绝"},
			},
			&core.TextField{Name: "reviewed_by", Required: false},
			&core.TextField{Name: "reviewed_at", Required: false},
		)

		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.CreateRule = types.Pointer("")
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("item_reports")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
