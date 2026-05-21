package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		locationsCollection, err := app.FindCollectionByNameOrId("locations")
		if err != nil {
			return err
		}

		collection := core.NewBaseCollection("items")

		collection.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.SelectField{
				Name:     "item_type",
				Required: true,
				Values:   []string{"3D打印材料", "机械耗材", "电子元件", "化学材料", "工具", "其他"},
			},
			&core.TextField{Name: "specification", Required: false},
			&core.SelectField{
				Name:     "status",
				Required: true,
				Values:   []string{"正常", "使用中", "余量低", "已耗尽", "损坏/失效", "位置不明"},
			},
			&core.RelationField{
				Name:         "location",
				Required:     false,
				CollectionId: locationsCollection.Id,
				MaxSelect:    types.Pointer(1),
			},
			&core.TextField{Name: "location_note", Required: false},
			&core.TextField{Name: "note", Required: false},
			&core.BoolField{Name: "is_active", Required: true},
		)

		collection.ListRule = types.Pointer("is_active = true")
		collection.ViewRule = types.Pointer("is_active = true")
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("items")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
