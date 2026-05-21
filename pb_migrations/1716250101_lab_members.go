package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		collection := core.NewBaseCollection("lab_members")

		collection.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.BoolField{Name: "is_active", Required: true},
			&core.TextField{Name: "note", Required: false},
		)

		collection.ListRule = types.Pointer("is_active = true")
		collection.ViewRule = types.Pointer("is_active = true")
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("lab_members")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
